# QuickDesk - Frontend Client

This is the Next.js-based client application for the QuickDesk platform, offering tailored views for employees and support agents.

---

## 🚀 Setup & Local Launch

1. **Navigate**: Ensure you are in the frontend directory: [frontend](file:///E:/ME/quickdesk/frontend).
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   - Create a `.env.local` file inside this directory.
   - Configure the required environment variables:
     ```ini
     NEXT_PUBLIC_API_URL="http://localhost:3000/api"
     NEXT_PUBLIC_WS_URL="http://localhost:3000/api/ws"
     ```
4. **Start Dev Server**:
   ```bash
   npm run dev
   ```
5. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📂 Project Structure

The client is built using the **Next.js App Router** with TypeScript:

- **[app](file:///E:/ME/quickdesk/frontend/app)**: Contains route pages, layouts, and global styles:
  - [login](file:///E:/ME/quickdesk/frontend/app/login): Login and registration portals.
  - [employee](file:///E:/ME/quickdesk/frontend/app/employee): Self-service AI chat widget and employee ticket management.
  - [agent](file:///E:/ME/quickdesk/frontend/app/agent): Realtime ticket queues, agent copilot panels, and active chat workspaces.
- **[components](file:///E:/ME/quickdesk/frontend/components)**: Reusable UI components (buttons, text inputs, modal popups, chat bubbles).
- **[hooks](file:///E:/ME/quickdesk/frontend/hooks)**: Custom hooks managing WebSocket events and global authentication states.
- **[app/globals.css](file:///E:/ME/quickdesk/frontend/app/globals.css)**: Core CSS design tokens, custom dark-mode properties, and micro-animations.

---

## 🎨 Design System & Aesthetics
- **Theme**: Premium dark-mode design with subtle glassmorphism visual elements.
- **Styling**: Built using standard CSS variables for absolute control and styling flexibility.
- **Typography**: Optimized loading using System Fonts with custom Sans-Serif fallbacks.

---

## 📚 Document References
For details regarding backend communications, refer to **[04 API Specification](file:///E:/ME/quickdesk/docs/04-api.md)**.
For real-time message payloads and socket events, refer to **[07 Realtime Gateway](file:///E:/ME/quickdesk/docs/07-realtime.md)**.
