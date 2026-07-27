# VPN Setup Guide

## Overview

All remote employees must connect to the corporate VPN before accessing internal systems, file shares, and development environments.

---

## Supported VPN Clients

- **Windows**: GlobalProtect Client v6.x
- **macOS**: GlobalProtect Client v6.x
- **Linux**: OpenConnect CLI or GlobalProtect GUI

---

## Installation Steps

1. Visit the IT Self-Service Portal at it-portal.company.com
2. Navigate to "Software Downloads" > "VPN Client"
3. Download the installer matching your operating system
4. Run the installer with administrator privileges
5. Restart your computer after installation completes

---

## First-Time Configuration

1. Open the GlobalProtect application
2. Enter the portal address: `vpn.company.com`
3. Click "Connect"
4. Enter your corporate email and password
5. Complete Multi-Factor Authentication (MFA) via Microsoft Authenticator
6. The VPN status should show "Connected" with a green icon

---

## Troubleshooting Common Issues

### TLS Handshake Failed
- Ensure your system clock is synchronized
- Disable any third-party firewall temporarily
- Try connecting from a different network
- Contact IT Support if the issue persists

### Authentication Errors
- Verify your corporate credentials are correct
- Check if your account is locked (see Password Reset Policy)
- Ensure MFA is properly configured on your device

### Slow Connection
- Try connecting to a different VPN gateway region
- Close bandwidth-heavy applications
- Check your local internet connection speed

---

## VPN Policies

- VPN sessions automatically disconnect after 12 hours of inactivity
- Split tunneling is enabled for approved SaaS applications
- All VPN traffic is encrypted using AES-256
- VPN access logs are retained for 90 days for compliance

---

## Support

For VPN-related issues, contact IT Support:
- Email: it-support@company.com
- Phone: Extension 4357
- Hours: Monday to Friday, 8 AM to 8 PM
