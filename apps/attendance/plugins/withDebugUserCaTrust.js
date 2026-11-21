/**
 * Debug builds only: let the Android app trust CA certificates the tester installed on the device
 * (Settings → Security → Install a certificate → CA certificate). Needed to point an emulator at a
 * backend behind a local HTTPS proxy (Caddy `tls internal`, mkcert, …) without a public certificate.
 *
 * Writes `android/app/src/debug/res/xml/network_security_config.xml` and a debug-variant manifest
 * that references it. The `release` source set is untouched: a release APK still trusts only the
 * system store, and cleartext HTTP stays forbidden in both variants (R9.7).
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const NETWORK_SECURITY_CONFIG = `<?xml version="1.0" encoding="utf-8"?>
<!-- Debug builds only (see plugins/withDebugUserCaTrust.js). Cleartext stays forbidden. -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>
</network-security-config>
`;

const DEBUG_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <!-- Debug builds only: trust user-installed CAs so an emulator can reach a local HTTPS proxy. -->
  <application android:networkSecurityConfig="@xml/network_security_config" />
</manifest>
`;

module.exports = function withDebugUserCaTrust(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const debugDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'debug');
      fs.mkdirSync(path.join(debugDir, 'res', 'xml'), { recursive: true });
      fs.writeFileSync(
        path.join(debugDir, 'res', 'xml', 'network_security_config.xml'),
        NETWORK_SECURITY_CONFIG,
      );
      fs.writeFileSync(path.join(debugDir, 'AndroidManifest.xml'), DEBUG_MANIFEST);
      return cfg;
    },
  ]);
};
