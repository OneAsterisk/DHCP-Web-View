export type FixedIp = {
    hostName: string | undefined;
    ip: string | undefined;
    type: string | undefined;
    typeOctet: string | undefined;
}

export type LeaseArray = {
    ip: string;
    status: string;
    hostname: string | undefined;
}


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
    const lines = dhcpdConf.split('\n');
    const ips = lines.slice(164);
    const fixedIps = [];
    for (const line of ips) {
        if (line.includes('fixed-address')) {
            const ip = line.match(/fixed-address\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)?.[1];
            const hostName = line.match(/\bhost\s+([^\s{]+)/)?.[1];
            const typeOctet = ip?.split('.')[2];
            const type = getTypeDescription(Number(typeOctet));
            fixedIps.push({hostName, ip, type, typeOctet});
        }
    }
    return sortIPs(fixedIps);

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
    console.log('sortedIps',sortedIps);
    return sortedIps;
}

export function createLeaseArray(fixedIps: FixedIp[], typeOctet: number, ipPrefix: string){
    const totalIps = 255;
    const leaseArray = [];
    for (let i = 1; i <= totalIps; i++) {
        const ip: string = `${ipPrefix}.${typeOctet}.${i}`;
        if (fixedIps.some(fixedIp => fixedIp.ip === ip)) {
            console.log('fixedIp',fixedIps.find(fixedIp => fixedIp.ip === ip));
            leaseArray.push({ip, status: 'Taken', hostname: fixedIps.find(fixedIp => fixedIp.ip === ip)?.hostName});
        } else {
            leaseArray.push({ip, status: 'Free', hostname: ''});
        }
        }
        console.log('leaseArray',leaseArray);
    
    return leaseArray;
}
