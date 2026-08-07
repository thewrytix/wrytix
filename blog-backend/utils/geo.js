const geoip = require('geoip-lite');

function getCountryFromIp(ip) {
    if (!ip) return 'Unknown';

    // Strip IPv6-mapped IPv4 prefix (common on Node/Express: "::ffff:127.0.0.1")
    const cleanIp = ip.replace('::ffff:', '').trim();

    if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('10.') || cleanIp.startsWith('192.168.')) {
        return 'Unknown'; // local/private IPs never resolve to a real country
    }

    const geo = geoip.lookup(cleanIp);
    return geo?.country || 'Unknown'; // ISO 3166-1 alpha-2 code, e.g. "GH", "US"
}

module.exports = { getCountryFromIp };