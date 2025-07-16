export type FixedIp = {
    hostName: string | undefined;
    ip: string | undefined;
    type: string | undefined;
    typeOctet: string | undefined;
    lineNumber: number;
    HWAddress: string | undefined;
}

export type LeaseArray = {
    ip: string;
    status: string;
    hostname: string | undefined;
    HWAddress: string | undefined;
}

const dhcpdConfPath = '/etc/dhcp/dhcpd.conf';

// Generic type descriptions for fallback when no server context is available
export const getTypeDescription = (type: number): string => {
    // Video/Special Equipment
    if (type >= 3 && type <= 9) return "Special Equipment";
    
    // Network Infrastructure
    if (type >= 10 && type <= 14) return "Network Switches";
    if (type >= 15 && type <= 19) return "Access Points";
    if (type === 20 || (type >= 21 && type <= 29)) return "Servers";
    
    // Printers
    if (type >= 30 && type <= 39) return "Printers";
    
    // Staff/Teachers
    if (type >= 40 && type <= 49) return "Staff Computers";
    
    // Students
    if (type >= 50 && type <= 69) {
      if (type >= 50 && type <= 51) return "Student Computers - District";
      if (type >= 52 && type <= 54) return "Student Computers - Elementary";
      if (type >= 55 && type <= 57) return "Student Computers - Middle School";
      if (type >= 58 && type <= 62) return "Student Computers - High School";
      if (type >= 63 && type <= 69) return "Student Devices";
    }
    
    // Specialized Equipment
    if (type === 70) return "Projectors";
    if (type >= 75 && type <= 79) return "HVAC and Appliances";
    if (type >= 100 && type <= 109) return "Gaming Equipment";
    
    // Special ranges
    if (type >= 250 && type <= 255) return "Dynamic Pool";
    
    return `Unknown Type ${type}`;
};

// New function to get type description based on server context
export const getTypeDescriptionFromContext = (
    typeOctet: number, 
    serverTypeDescriptions: { [key: string]: number[] }
): string => {
    // Find the type description that contains this octet number
    for (const [typeName, octets] of Object.entries(serverTypeDescriptions)) {
        if (octets.includes(typeOctet)) {
            return typeName;
        }
    }
    
    // Fallback to generic description
    return getTypeDescription(typeOctet);
};

// Updated parseDHCPDConf function to accept server context
export function parseDHCPDConf(dhcpdConf: string, serverTypeDescriptions?: { [key: string]: number[] }) {
    const fixedIps: Array<{
      hostName: string;
      ip: string;
      type: string;
      typeOctet: string;
      lineNumber: number;
      HWAddress: string;
    }> = [];
  
    // 1. throw away comments so they don’t break the regex
    const cleaned = dhcpdConf
      .split('\n')
      .map((l) => l.replace(/#.*$/, '').trim())
      .join('\n');
  
    // 2. dot matches newlines workaround for JS (no (?s) flag in JS regex)
    const hostRegex =
      /\bhost\s+([^\s{]+)\s*\{([\s\S]*?)\}/g;
  
    let m;
    while ((m = hostRegex.exec(cleaned)) !== null) {
      const [, hostName, body] = m;
  
      const macMatch = body.match(/\bhardware\s+ethernet\s+([0-9a-fA-F:]{17})/);
      const ipMatch = body.match(/\bfixed-address\s+(\d{1,3}(?:\.\d{1,3}){3})/);
  
      if (!macMatch || !ipMatch) continue;
  
      const ip = ipMatch[1];
      const typeOctet = ip.split('.')[2];
      const type = getTypeDescriptionFromContext(Number(typeOctet), serverTypeDescriptions || {});
  
      // line number of the host keyword
      const lineNumber = cleaned.slice(0, m.index).split('\n').length;
      fixedIps.push({
        hostName,
        ip,
        type,
        typeOctet,
        lineNumber,
        HWAddress: macMatch[1],
      });
    }
  
    return sortIPs(fixedIps);
  }

  export function deleteHostEntry(dhcpdConf: string, hostName: string): string {
    const lines = dhcpdConf.split('\n');
    
    // Find the starting line of the host block in the original content
    const hostBlockStartIndex = lines.findIndex(line => {
      // Use a regex to robustly find the host entry, allowing for different spacing
      const regex = new RegExp(`\\bhost\\s+${hostName}\\s*\\{`);
      return regex.test(line);
    });

    if (hostBlockStartIndex === -1) {
      console.error(`Host entry for "${hostName}" not found.`);
      return dhcpdConf; // Return original content if host not found
    }

    // Find the corresponding closing brace
    let braceCounter = 0;
    let hostBlockEndIndex = -1;
    for (let i = hostBlockStartIndex; i < lines.length; i++) {
      if (lines[i].includes('{')) {
        braceCounter++;
      }
      if (lines[i].includes('}')) {
        braceCounter--;
      }
      if (braceCounter === 0) {
        hostBlockEndIndex = i;
        break;
      }
    }

    if (hostBlockEndIndex === -1) {
      console.error(`Could not find closing brace for host entry "${hostName}".`);
      return dhcpdConf; // Return original content if something is wrong
    }

    // Remove the entire block
    lines.splice(hostBlockStartIndex, hostBlockEndIndex - hostBlockStartIndex + 1);

    return lines.join('\n');
  }

  export function updateHostEntry(dhcpdConf: string, hostName: string, newIP?: string, newMAC?: string, newHostName?: string, serverTypeDescriptions?: { [key: string]: number[] }) {
    const lines = dhcpdConf.split('\n');
    const hosts = parseDHCPDConf(dhcpdConf, serverTypeDescriptions);
    
    const target = hosts.find((host: FixedIp) => host.hostName === hostName);
    
    if(!target) {
        // For new entries, find the right insertion point by IP address
        const finalName = newHostName ?? hostName;
        const newBlock = `host ${finalName} { hardware ethernet ${newMAC}; fixed-address ${newIP}; }`;
        
        // Build an array of every host line with its IP address
        const hostEntries: Array<{ lineIndex: number; ip: string }> = [];
        lines.forEach((line, idx) => {
          const ipMatch = line.match(/fixed-address\s+(\d{1,3}(?:\.\d{1,3}){3})/);
          if (ipMatch) hostEntries.push({ lineIndex: idx, ip: ipMatch[1] });
        });
        
        // Sort by IP (lexicographic is fine for dotted quads)
        hostEntries.sort((a, b) => a.ip.localeCompare(b.ip));
        
        // Find the first host whose IP is greater than the new one
        const newIPVal = newIP ?? '';
        let insertIndex = lines.length; // default: append
        for (const entry of hostEntries) {
          if (entry.ip > newIPVal) {
            insertIndex = entry.lineIndex;
            break;
          }
        }
        
        lines.splice(insertIndex, 0, newBlock);
        return lines.join('\n');
    }
    const finalName = newHostName ?? hostName;
    const indent = (lines[target.lineNumber] || '').match(/^\s*/)?.[0] ?? '';
    const newBlock = [
      `${indent}host ${finalName} {`,
      newMAC ? `${indent}  hardware ethernet ${newMAC};` : undefined,
      newIP ? `${indent}  fixed-address ${newIP};` : undefined,
      `${indent}}`,
    ]
      .filter(Boolean)
      .join(' ');
    console.log('lineNumber',target.lineNumber);
    lines.splice(
      target.lineNumber -1,
      1,
      newBlock
    );
    console.log('newBlock',newBlock);
    console.log('lines',lines);
    return lines.join('\n');
}


//Sorts based on the type octec
function sortIPs(fixedIps: FixedIp[]){
    const sortedIps = fixedIps.sort((a, b) => a.typeOctet?.localeCompare(b.typeOctet || '') || 0);
    return sortedIps;
}

export function createLeaseArray(fixedIps: FixedIp[], typeOctet: number, ipPrefix: string, startRange: number = 1, endRange: number = 255){
    const leaseArray = [];
    
    // Count the number of octets in the ipPrefix
    const prefixOctets = ipPrefix.split('.').length;
    
    for (let i = startRange; i <= endRange; i++) {
        let ip: string;
        
        if (prefixOctets === 2) {
            // Traditional format: ipPrefix has 2 octets, typeOctet becomes 3rd octet
            // Example: "10.110" + "50" + "1" = "10.110.50.1"
            ip = `${ipPrefix}.${typeOctet}.${i}`;
        } else {
            // New subnet format: ipPrefix already includes all network octets
            // Example: "10.20.114" + "1" = "10.20.114.1"
            ip = `${ipPrefix}.${i}`;
        }
        
        if (fixedIps.some(fixedIp => fixedIp.ip === ip)) {
            leaseArray.push({ip, status: 'Taken', hostname: fixedIps.find(fixedIp => fixedIp.ip === ip)?.hostName, HWAddress: fixedIps.find(fixedIp => fixedIp.ip === ip)?.HWAddress});
        } else {
            leaseArray.push({ip, status: 'Free', hostname: '', HWAddress: ''});
        }
    }
    
    return leaseArray;
}

// New function for handling large ranges more efficiently with pagination
export function createVOIPLeaseArray(fixedIps: FixedIp[], ipPrefix: string, typeNumbers: number[], page: number = 1, itemsPerPage: number = 50) {
    const leaseArray = [];
    
    // Calculate total IPs across all type numbers
    const totalIPs = typeNumbers.length * 255;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage - 1, totalIPs - 1);
    
    let currentIndex = 0;
    
    for (const typeOctet of typeNumbers) {
        for (let i = 1; i <= 255; i++) {
            if (currentIndex >= startIndex && currentIndex <= endIndex) {
                const ip = `${ipPrefix}.${typeOctet}.${i}`;
                
                if (fixedIps.some(fixedIp => fixedIp.ip === ip)) {
                    leaseArray.push({
                        ip, 
                        status: 'Taken', 
                        hostname: fixedIps.find(fixedIp => fixedIp.ip === ip)?.hostName, 
                        HWAddress: fixedIps.find(fixedIp => fixedIp.ip === ip)?.HWAddress
                    });
                } else {
                    leaseArray.push({ip, status: 'Free', hostname: '', HWAddress: ''});
                }
            }
            
            currentIndex++;
            
            // Early exit if we've collected enough IPs for this page
            if (currentIndex > endIndex) {
                return leaseArray;
            }
        }
    }
    
    return leaseArray;
}

// Helper function to calculate total pages for large ranges
export function calculateVOIPPages(typeNumbers: number[], itemsPerPage: number = 50): number {
    const totalIPs = typeNumbers.length * 255;
    return Math.ceil(totalIPs / itemsPerPage);
}

