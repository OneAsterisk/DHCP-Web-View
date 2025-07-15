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

export const getTypeDescription = (type: number): string => {
    if (type === 10) return "Network Switches";
    if (type >= 15 && type <= 16) return "Access Points";
    if (type === 20) return "Servers";
    if (type >= 30 && type <= 39) return "Printers";
    if (type >= 40 && type <= 49) return "Teacher Machines";
    if (type >= 50 && type <= 69) {
      if (type >= 50 && type <= 51) return "Student Machines - District";
      if (type >= 52 && type <= 54) return "Student Machines - Elementary";
      if (type >= 55 && type <= 57) return "Student Machines - Middle School";
      if (type >= 58 && type <= 60) return "Student Machines - High School";
      if (type >= 61 && type <= 69) return "Student Chromebooks";
    }
    if (type === 70) return "Networked Projectors";
    if (type === 75) return "HVAC and Appliances";
    if (type === 100) return "eSports - Nintendo Switches";
    if (type >= 253 && type <= 254) return "Dynamic Pool";
    return `Unknown Type ${type}`;
  };
// TODO: Add district to the parseDHCPDConf function
export function parseDHCPDConf(dhcpdConf: string) {
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
      const type = getTypeDescription(Number(typeOctet));
  
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

export function updateHostEntry(dhcpdConf: string, hostName: string, newIP?: string, newMAC?: string, newHostName?: string) {
    const lines = dhcpdConf.split('\n');
    const hosts = parseDHCPDConf(dhcpdConf);
    console.log('Lines before update',lines);
    const target = hosts.find((host: FixedIp) => host.hostName === hostName);
    console.log('target',target);
    console.log('hostName',hostName);
    console.log('newIP',newIP);
    console.log('newMAC',newMAC);
    console.log('newHostName',newHostName);
    if(!target) throw new Error(`Host ${hostName} not found`);

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
      target.lineNumber,
      newBlock
    );
    console.log('newBlock',newBlock);
    console.log('lines',lines);
}


//Filters by type and sorts by type octet
// Maybe not needed?
function filterByTypeAndSort(fixedIps: any[], type: string) {
    const filteredIps = fixedIps.filter((ip) => ip.type === type);
    const sortedIps = sortIPs(filteredIps);
    return sortedIps;
}
//Sorts based on the type octec
function sortIPs(fixedIps: FixedIp[]){
    const sortedIps = fixedIps.sort((a, b) => a.typeOctet?.localeCompare(b.typeOctet || '') || 0);
    return sortedIps;
}

export function createLeaseArray(fixedIps: FixedIp[], typeOctet: number, ipPrefix: string){
    const totalIps = 255;
    const leaseArray = [];
    for (let i = 1; i <= totalIps; i++) {
        const ip: string = `${ipPrefix}.${typeOctet}.${i}`;
        if (fixedIps.some(fixedIp => fixedIp.ip === ip)) {
            leaseArray.push({ip, status: 'Taken', hostname: fixedIps.find(fixedIp => fixedIp.ip === ip)?.hostName, HWAddress: fixedIps.find(fixedIp => fixedIp.ip === ip)?.HWAddress});
        } else {
            leaseArray.push({ip, status: 'Free', hostname: '', HWAddress: ''});
        }
        }
    
    return leaseArray;
}
