export const privacyPolicyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — DOCKS & BRIDGES</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      color: #1a1a2e;
      line-height: 1.7;
      padding: 0;
    }
    .header {
      background: #1a1a2e;
      color: #fff;
      padding: 48px 24px 36px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 14px;
      opacity: 0.7;
    }
    .content {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 24px 64px;
    }
    h2 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin-top: 32px;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #444;
      margin-bottom: 12px;
    }
    ul {
      padding-left: 20px;
      margin-bottom: 12px;
    }
    ul li {
      font-size: 15px;
      color: #444;
      margin-bottom: 6px;
    }
    .footer {
      text-align: center;
      padding: 24px;
      font-size: 13px;
      color: #999;
      border-top: 1px solid #e0e0e0;
      max-width: 720px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Privacy Policy</h1>
    <p>Last updated: 1 March 2026</p>
  </div>
  <div class="content">
    <h2>1. Information We Collect</h2>
    <p>We collect the following information to provide our truck routing and dock-finding services:</p>
    <ul>
      <li>Location data (GPS coordinates) when you use navigation features</li>
      <li>Truck profile information (vehicle height, type, name) stored locally on your device</li>
      <li>Route history and favourite docks stored locally on your device</li>
      <li>Hazard and dock reports you voluntarily submit</li>
    </ul>

    <h2>2. How We Use Your Information</h2>
    <p>Your information is used exclusively to:</p>
    <ul>
      <li>Provide turn-by-turn navigation and route planning</li>
      <li>Show nearby docks and height hazards relevant to your vehicle</li>
      <li>Calculate safe routes based on your truck's height profile</li>
      <li>Improve hazard and dock data for all users</li>
    </ul>

    <h2>3. Data Storage</h2>
    <p>Your truck profile, favourites, and route history are stored locally on your device using secure storage. We do not transmit personal data to external servers. Map and routing data is fetched from third-party services (OpenStreetMap, OSRM) which have their own privacy policies.</p>

    <h2>4. Location Data</h2>
    <p>Location data is used in real-time for navigation and is not stored on any server. When you enable live navigation, your device's GPS is accessed to provide turn-by-turn directions and off-route detection. You can disable location access at any time through your device settings.</p>

    <h2>5. Third-Party Services</h2>
    <p>This app uses the following third-party services:</p>
    <ul>
      <li>OpenStreetMap / Nominatim for geocoding and place search</li>
      <li>OSRM (Open Source Routing Machine) for route calculations</li>
      <li>Overpass API for hazard and dock point-of-interest data</li>
    </ul>
    <p>These services may log IP addresses per their own policies. We encourage you to review their privacy policies.</p>

    <h2>6. Data Sharing</h2>
    <p>We do not sell, trade, or rent your personal information to third parties. Hazard and dock reports you submit may be shared with the community to improve data accuracy for all drivers.</p>

    <h2>7. Your Rights</h2>
    <p>You can delete all locally stored data at any time by clearing the app's data or uninstalling the app. You can revoke location permissions through your device settings at any time.</p>

    <h2>8. Children's Privacy</h2>
    <p>This app is not intended for use by children under 16. We do not knowingly collect information from children.</p>

    <h2>9. Changes to This Policy</h2>
    <p>We may update this privacy policy from time to time. Changes will be reflected within the app and on this page with an updated date.</p>

    <h2>10. Contact Us</h2>
    <p>If you have questions about this privacy policy, please contact us at <a href="mailto:support@docksandbridges.app">support@docksandbridges.app</a>.</p>
  </div>
  <div class="footer">
    &copy; 2026 DOCKS &amp; BRIDGES. All rights reserved.
  </div>
</body>
</html>`;
