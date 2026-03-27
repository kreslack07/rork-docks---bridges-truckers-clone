export const supportHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Support — DOCKS & BRIDGES</title>
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
    .contact-card {
      background: #fff;
      border-radius: 12px;
      padding: 24px;
      margin-top: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .contact-card h3 {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .contact-card p {
      margin-bottom: 4px;
    }
    .contact-card a {
      color: #2563eb;
      text-decoration: none;
    }
    .contact-card a:hover {
      text-decoration: underline;
    }
    .faq-item {
      background: #fff;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }
    .faq-item h3 {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    .faq-item p {
      font-size: 14px;
      color: #555;
      margin-bottom: 0;
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
    <h1>Support</h1>
    <p>DOCKS &amp; BRIDGES — for trucks on the go</p>
  </div>
  <div class="content">
    <p>We're here to help! If you're experiencing issues with the app or have questions, check the FAQs below or reach out to our support team.</p>

    <div class="contact-card">
      <h3>Contact Us</h3>
      <p>Email: <a href="mailto:support@docksandbridges.app">support@docksandbridges.app</a></p>
      <p>We typically respond within 24–48 hours.</p>
    </div>

    <h2>Frequently Asked Questions</h2>

    <div class="faq-item">
      <h3>How do I set up my truck profile?</h3>
      <p>Go to the Profile tab and enter your vehicle's height, weight, and type. This information is used to calculate safe routes that avoid low bridges and restricted roads.</p>
    </div>

    <div class="faq-item">
      <h3>Why is my route avoiding certain roads?</h3>
      <p>Routes are calculated based on your truck profile. Roads with height restrictions, weight limits, or known hazards for your vehicle type will be avoided automatically.</p>
    </div>

    <div class="faq-item">
      <h3>How do I report a hazard or dock?</h3>
      <p>Tap the "+" button on the map or go to the Hazards tab. You can report low bridges, road hazards, loading docks, and other points of interest for the trucking community.</p>
    </div>

    <div class="faq-item">
      <h3>Is my location data stored?</h3>
      <p>No. Location data is used in real-time for navigation only and is not stored on any server. See our <a href="/privacy-policy">Privacy Policy</a> for full details.</p>
    </div>

    <div class="faq-item">
      <h3>The app isn't showing my location. What should I do?</h3>
      <p>Make sure location permissions are enabled for the app in your device settings. On iOS, go to Settings > Privacy > Location Services. On Android, go to Settings > Apps > DOCKS & BRIDGES > Permissions.</p>
    </div>

    <div class="faq-item">
      <h3>How do I delete my data?</h3>
      <p>All your data (truck profile, favourites, route history) is stored locally on your device. You can clear it by going to Profile > Reset Data, or by uninstalling the app.</p>
    </div>

    <div class="faq-item">
      <h3>Can I use this app offline?</h3>
      <p>Some features like saved favourites and your truck profile are available offline. However, route calculation, map display, and hazard data require an internet connection.</p>
    </div>
  </div>
  <div class="footer">
    &copy; 2026 DOCKS &amp; BRIDGES. All rights reserved.
  </div>
</body>
</html>`;
