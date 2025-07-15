# DHCP Web View

A web-based interface for viewing and managing ISC-DHCP-Server configurations on remote Linux servers.

## Overview

This application provides a user-friendly way for network administrators to interact with DHCP server configurations without needing direct command-line access for every operation. It allows viewing the status of the DHCP service, browsing IP address ranges, and managing fixed-IP (static) reservations.

## Features

- **Server Status:** Check if the `isc-dhcp-server` service is active and running on the remote server.
- **Multi-Server Support:** Easily switch between different DHCP servers defined in a central configuration file.
- **IP Address Management:**
    - View IP addresses grouped by device type (e.g., Printers, Servers, Access Points).
    - See the status of each IP in a range (Free or Taken).
    - View details for assigned IPs, including hostname and MAC address.
- **Modify Entries:**
    - **Add New Entries:** Click on a "Free" IP address to open a form and create a new fixed-IP reservation.
    - **Update Existing Entries:** Modify the hostname or MAC address for an existing reservation.
- **Secure Connection:** All operations on the remote server are performed securely over SSH.
- **Atomic File Operations:** When updating the configuration, the application first writes to a temporary file and then moves it into place to prevent corruption.
- **Automatic Backups:** Automatically creates a timestamped backup of the `dhcpd.conf` file before every change.

## Tech Stack

- **Frontend:**
  - [React](https://reactjs.org/)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Vite](https://vitejs.dev/) for frontend tooling
  - [Tailwind CSS](https://tailwindcss.com/) for styling

- **Backend:**
  - [Node.js](https://nodejs.org/)
  - [Express.js](https://expressjs.com/) for the API
  - [node-ssh](https://www.npmjs.com/package/node-ssh) for SSH/SFTP communication

## Setup and Installation

### Prerequisites

- Node.js and npm
- An SSH user on the target DHCP server(s) with `sudo` privileges for restarting the DHCP service and moving files.

### Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure your DHCP servers in `backend/servers.json`. See the configuration section below.
4.  Start the backend server:
    ```bash
    npm start
    ```
    The backend will be running on `http://localhost:3001` by default.

### Frontend Setup

1.  Navigate to the `app` directory:
    ```bash
    cd app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the frontend development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Configuration

All server configurations are managed in the `backend/servers.json` file. Each server entry should have the following structure:

```json
{
    "name": "Server Display Name",
    "host": "dhcp.server.hostname.org",
    "ipPrefix": "10.110",
    "typeDescriptions": {
        "Network Switches": [10, 11, 12],
        "Access Points": [15, 16],
        "Servers": [20],
        "Printers": [30, 31],
        "Dynamic Pool": [253, 254]
    }
}
```

- `name`: A user-friendly name for the server dropdown.
- `host`: The hostname or IP address of the DHCP server to connect to via SSH.
- `ipPrefix`: The first two octets of the IP addresses for this server's network.
- `typeDescriptions`: An object that maps descriptive names to the third octet of an IP address. This is used to group devices.

## Features in Progress

1. Subnet checking
2. Deleting Entries
3. Nicer Styling?

## Usage

1.  Start both the backend and frontend servers.
2.  Open the application in your web browser.
3.  Select a server from the dropdown menu.
4.  Enter your SSH username and password for that server and click "Login".
5.  The DHCP service status will be displayed.
6.  Select a device type to view the corresponding IP address range.
7.  The table will show which IPs are free and which are taken.
8.  Click **Add Entry** on a free IP to create a new reservation.
9.  Click **Change Entry** on a taken IP to modify its details.
10. All changes will be written to the remote `dhcpd.conf` file, and the DHCP service will be restarted to apply them. 