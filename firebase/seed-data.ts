// Static reference data used by seed.ts. Kept separate from the
// orchestration logic so each file stays readable.

export const ROLES = ["Employee", "Technician", "Manager", "Administrator"] as const;

export const DEPARTMENTS = [
  { name: "IT", description: "Information Technology" },
  { name: "HR", description: "Human Resources" },
  { name: "Finance", description: "Finance & Accounting" },
  { name: "Sales", description: "Sales & Business Development" },
  { name: "Operations", description: "Operations" },
  { name: "Marketing", description: "Marketing & Communications" },
  { name: "Administration", description: "Executive & Administration" },
];

export const LOCATIONS = [
  { name: "HQ - New York", city: "New York", country: "USA" },
  { name: "London Office", city: "London", country: "UK" },
  { name: "Chicago Branch", city: "Chicago", country: "USA" },
  { name: "Remote", city: "Remote", country: "N/A" },
];

export const PRIORITIES = [
  { name: "Low", level: 1, colorHex: "#6b7280", firstResponseMinutes: 480, resolutionMinutes: 5 * 24 * 60 },
  { name: "Medium", level: 2, colorHex: "#2563eb", firstResponseMinutes: 240, resolutionMinutes: 2 * 24 * 60 },
  { name: "High", level: 3, colorHex: "#d97706", firstResponseMinutes: 30, resolutionMinutes: 8 * 60 },
  { name: "Critical", level: 4, colorHex: "#dc2626", firstResponseMinutes: 15, resolutionMinutes: 4 * 60 },
];

export const CATEGORIES: Record<string, string[]> = {
  Hardware: ["Laptop", "Desktop", "Monitor", "Printer", "Keyboard", "Mouse"],
  Software: ["Microsoft 365", "Windows", "VPN", "ERP", "CRM", "Antivirus"],
  Network: ["Internet", "Wi-Fi", "VPN", "Network Access"],
  Access: ["Password Reset", "Account Access", "Application Access", "Shared Drive"],
};

export const ASSET_TYPES = [
  "Laptop",
  "Desktop",
  "Monitor",
  "Printer",
  "Phone",
  "Keyboard",
  "Mouse",
  "Server",
  "Networking Equipment",
];

export const KB_CATEGORIES = [
  "Getting Started",
  "Accounts & Access",
  "Hardware",
  "Software",
  "Network & VPN",
  "Security",
];

export const KB_ARTICLES: Array<{ title: string; category: string; tags: string[]; content: string }> = [
  {
    title: "How to Reset Your Password",
    category: "Accounts & Access",
    tags: ["password", "login", "account"],
    content:
      "1. Go to the company login portal.\n2. Click 'Forgot Password'.\n3. Enter your work email address.\n4. Check your email for a reset link (valid for 30 minutes).\n5. Choose a new password that meets the complexity policy (12+ characters, mixed case, number, symbol).\n6. Log in with your new password.\n\nIf you do not receive the email within 5 minutes, check your spam folder or contact the helpdesk.",
  },
  {
    title: "How to Connect to the Company VPN",
    category: "Network & VPN",
    tags: ["vpn", "remote", "network"],
    content:
      "1. Install the approved VPN client from the Software Center.\n2. Launch the client and enter server address vpn.company.local.\n3. Sign in with your network username and password.\n4. Approve the MFA push notification on your phone.\n5. Once connected, you should see a green indicator in the system tray.\n\nContact IT if the connection fails after 3 attempts.",
  },
  {
    title: "How to Configure Outlook for the First Time",
    category: "Software",
    tags: ["outlook", "email", "microsoft365"],
    content:
      "1. Open Outlook.\n2. Enter your work email address and click Connect.\n3. Enter your password when prompted.\n4. Complete MFA verification.\n5. Outlook will automatically configure your mailbox settings.\n6. Allow a few minutes for mail to sync.",
  },
  {
    title: "How to Connect to Office Wi-Fi",
    category: "Network & VPN",
    tags: ["wifi", "network"],
    content:
      "1. Open Wi-Fi settings on your device.\n2. Select the network 'CompanySecure'.\n3. Enter your network credentials when prompted.\n4. Accept the certificate warning if shown (this is expected for our network).\n5. You should be connected within a few seconds.",
  },
  {
    title: "How to Request Software Access",
    category: "Accounts & Access",
    tags: ["software", "access-request"],
    content:
      "1. Create a new helpdesk ticket under category Access > Application Access.\n2. Specify the software name and business justification.\n3. Your manager will be notified for approval.\n4. Once approved, IT will provision access within 1 business day.\n5. You will receive a notification once access has been granted.",
  },
  {
    title: "How to Set Up Multi-Factor Authentication (MFA)",
    category: "Security",
    tags: ["mfa", "security", "authentication"],
    content:
      "1. Download the Microsoft Authenticator app on your phone.\n2. Go to the account security portal and select 'Add MFA method'.\n3. Scan the QR code with the Authenticator app.\n4. Enter the 6-digit code shown in the app to confirm setup.\n5. Save your recovery codes in a safe place.",
  },
  {
    title: "How to Map a Shared Network Drive",
    category: "Software",
    tags: ["shared-drive", "network"],
    content:
      "1. Open File Explorer.\n2. Right-click 'This PC' and select 'Map Network Drive'.\n3. Choose a drive letter.\n4. Enter the folder path provided by IT (e.g. \\\\fileserver\\department).\n5. Check 'Reconnect at sign-in' and click Finish.\n6. Enter your credentials if prompted.",
  },
  {
    title: "How to Report a Lost or Stolen Device",
    category: "Security",
    tags: ["security", "asset", "device"],
    content:
      "1. Immediately open a Critical priority ticket under Hardware.\n2. Include the asset tag if known.\n3. IT will remotely lock and wipe the device if enrolled in MDM.\n4. Notify your manager and, if applicable, physical security.\n5. A replacement device will be issued once the incident is closed.",
  },
  {
    title: "How to Install Printer Drivers",
    category: "Hardware",
    tags: ["printer", "drivers"],
    content:
      "1. Go to Settings > Printers & Scanners.\n2. Click 'Add a printer or scanner'.\n3. Select the nearest office printer from the list (named by floor/room).\n4. Wait for Windows to install the driver automatically.\n5. Print a test page to confirm.",
  },
  {
    title: "How to Request New Hardware",
    category: "Hardware",
    tags: ["hardware", "asset-request"],
    content:
      "1. Submit a ticket under Hardware with the equipment type needed.\n2. Include business justification and cost center.\n3. Your manager approves the request.\n4. Procurement orders the equipment.\n5. IT will image and deliver the device, and register it as an asset assigned to you.",
  },
  {
    title: "How to Fix Common Wi-Fi Connectivity Issues",
    category: "Network & VPN",
    tags: ["wifi", "troubleshooting"],
    content:
      "1. Toggle Wi-Fi off and on.\n2. Forget the network and reconnect.\n3. Restart your device.\n4. Ensure you are within range of an access point.\n5. If the issue persists, submit a ticket under Network > Wi-Fi with your location.",
  },
  {
    title: "How to Access the Company CRM",
    category: "Software",
    tags: ["crm", "software"],
    content:
      "1. Navigate to crm.company.local.\n2. Sign in with your company SSO credentials.\n3. If you see 'Access Denied', submit an Application Access ticket.\n4. Access is typically granted within 1 business day after manager approval.",
  },
  {
    title: "How to Update Antivirus Software",
    category: "Security",
    tags: ["antivirus", "security"],
    content:
      "1. Open the antivirus dashboard from the system tray.\n2. Click 'Check for updates'.\n3. Allow the update to download and install.\n4. Restart your device if prompted.\n5. Definitions update automatically every 4 hours when connected to the network or VPN.",
  },
  {
    title: "Getting Started: How the Helpdesk Works",
    category: "Getting Started",
    tags: ["overview", "helpdesk"],
    content:
      "Submit tickets for any IT issue via 'Create Ticket'. Choose the most specific category so it routes to the right team. Priority is set based on business impact - use Critical only for outages affecting multiple people. Track progress from 'My Tickets', and you'll be notified when a technician replies or resolves your issue.",
  },
  {
    title: "How to Request Elevated (Admin) Access on Your Laptop",
    category: "Accounts & Access",
    tags: ["admin-access", "software"],
    content:
      "1. Submit a ticket under Access > Application Access explaining why local admin rights are needed.\n2. Manager approval is required for all elevated access requests.\n3. Access is typically time-boxed and reviewed quarterly.\n4. Once approved, IT will enroll your device in the elevated access group.",
  },
];

export const FIRST_NAMES = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda",
  "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
  "Thomas", "Sarah", "Charles", "Karen", "Priya", "Wei", "Fatima", "Carlos",
];

export const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
  "Taylor", "Moore", "Jackson", "Martin", "Patel", "Chen", "Khan", "Silva",
];
