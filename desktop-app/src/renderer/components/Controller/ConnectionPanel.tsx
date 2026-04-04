// src/renderer/components/Controller/ConnectionPanel.tsx
// REPLACE ENTIRE FILE

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';

interface ConnectedClient {
  id:          string;
  name:        string;
  role:        string;
  connectedAt: number;
}

interface ConnectionPanelProps {
  isOpen:  boolean;
  onClose: () => void;
}

type QRTarget = 'controller' | 'viewer';

const WS_PORT = 8765;  // Single port for both HTTP and WS
const URL_PORT = 5173;

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({ isOpen, onClose }) => {
  const [localIP, setLocalIP]                   = useState<string>('loading...');
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  const [qrTarget, setQrTarget]                 = useState<QRTarget>('controller');
  const [copied, setCopied]                     = useState<string | null>(null);
  const [serverOnline, setServerOnline]         = useState(false);
  const socketRef                               = useRef<Socket | null>(null);

  // ── Fetch local IP ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const api = (window as any).electronAPI;
    if (api?.getLocalIP) {
      api.getLocalIP().then((ip: string) => setLocalIP(ip));
    } else {
      setLocalIP(window.location.hostname || 'localhost');
    }
  }, [isOpen]);

  // ── Connect to WS to watch client list ────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const socket = io(`http://localhost:${WS_PORT}`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setServerOnline(true);
      socket.emit('register', { name: 'Editor Panel', role: 'editor' });
      socket.emit('request-sync');
    });

    socket.on('sync-state', (data: any) => {
      if (Array.isArray(data.clients)) setConnectedClients(data.clients);
    });

    socket.on('clients-updated', (clients: ConnectedClient[]) => {
      setConnectedClients(clients);
    });

    socket.on('disconnect',    () => setServerOnline(false));
    socket.on('connect_error', () => setServerOnline(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isOpen]);

  // ── Escape to close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ── Copy helper ───────────────────────────────────────────────────────────
  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  if (!isOpen) return null;

  // ── URLs ──────────────────────────────────────────────────────────────────
  // Everything served from the SAME port now
  const base          = `http://${localIP}`;
  const controllerUrl = `${base}:${URL_PORT}/#/controller`;
  const viewerUrl     = `${base}:${URL_PORT}/#/viewer`;       // browser presentation viewer
  const wsUrl         = `ws://${localIP}:${WS_PORT}`;

  const qrValue = qrTarget === 'controller' ? wsUrl : viewerUrl;

  const externalClients = connectedClients.filter((c) => c.role !== 'editor');

  const roleIcon: Record<string, string> = {
    controller: '🎮',
    display:    '🖥️',
    viewer:     '👁️',
    editor:     '✏️',
  };

  const roleColor: Record<string, string> = {
    controller: '#3b82f6',
    display:    '#22c55e',
    viewer:     '#a78bfa',
    editor:     '#f59e0b',
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,0.75)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         9999,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background:    '#1a1a2e',
        border:        '1px solid #2d2d4e',
        borderRadius:  16,
        padding:       24,
        width:         '100%',
        maxWidth:      480,
        maxHeight:     '90vh',
        overflowY:     'auto',
        margin:        '0 16px',
        boxShadow:     '0 24px 64px rgba(0,0,0,0.7)',
        display:       'flex',
        flexDirection: 'column',
        gap:           18,
      }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#f9fafb', fontSize: 18,
                         fontWeight: 700 }}>
              📡 Connect Devices
            </h2>
            <div style={{ display: 'flex', alignItems: 'center',
                          gap: 6, marginTop: 4 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: serverOnline ? '#22c55e' : '#ef4444',
                boxShadow:  serverOnline ? '0 0 6px #22c55e' : 'none',
                transition: 'all 0.3s',
              }} />
              <span style={{ color:   serverOnline ? '#86efac' : '#fca5a5',
                             fontSize: 12 }}>
                {serverOnline
                  ? `Server online · port ${WS_PORT}`
                  : 'Server offline'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#374151', border: 'none', borderRadius: 8,
              color: '#9ca3af', cursor: 'pointer',
              width: 32, height: 32, fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* ── QR Tab selector ── */}
        <div style={{
          display:    'flex',
          gap:        4,
          background: '#111827',
          borderRadius: 10,
          padding:    4,
        }}>
          {[
            { key: 'controller' as QRTarget, icon: '🎮', label: 'Controller' },
            { key: 'viewer'     as QRTarget, icon: '👁️', label: 'Viewer'     },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setQrTarget(tab.key)}
              style={{
                flex:         1,
                padding:      '8px 0',
                borderRadius: 7,
                border:       'none',
                background:   qrTarget === tab.key ? '#2563eb' : 'transparent',
                color:        qrTarget === tab.key ? '#fff'    : '#6b7280',
                fontSize:     12,
                fontWeight:   qrTarget === tab.key ? 600       : 400,
                cursor:       'pointer',
                transition:   'all 0.15s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab description ── */}
        <div style={{
          background:   qrTarget === 'controller'
            ? 'rgba(59,130,246,0.08)'
            : 'rgba(167,139,250,0.08)',
          border:       `1px solid ${qrTarget === 'controller'
            ? 'rgba(59,130,246,0.2)'
            : 'rgba(167,139,250,0.2)'}`,
          borderRadius: 8,
          padding:      '8px 12px',
          fontSize:     11,
          color:        '#9ca3af',
          lineHeight:   1.6,
        }}>
          {qrTarget === 'controller' ? (
            <>
              <b style={{ color: '#93c5fd' }}>🎮 Controller</b>
              {' '}— Control slides, navigate, start/stop the presentation
              from your phone or another device.
            </>
          ) : (
            <>
              <b style={{ color: '#c4b5fd' }}>👁️ Viewer</b>
              {' '}— Watch the live presentation directly in a browser.
              The slide content renders in real-time as you advance slides.
            </>
          )}
        </div>

        {/* ── QR Code ── */}
        <div style={{ display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 10 }}>
          <div style={{
            background:   '#fff',
            padding:      16,
            borderRadius: 12,
            boxShadow:    '0 4px 20px rgba(0,0,0,0.4)',
            position:     'relative',
          }}>
            <QRCodeSVG
              value={qrValue}
              size={200}
              level="M"
              includeMargin={false}
            />
            {/* Corner accent */}
            <div style={{
              position:   'absolute',
              bottom:     -1, right: -1,
              background: qrTarget === 'controller' ? '#2563eb' : '#7c3aed',
              color:      '#fff',
              fontSize:   9,
              fontWeight: 700,
              padding:    '2px 6px',
              borderRadius: '8px 0 8px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {qrTarget}
            </div>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 11,
                      textAlign: 'center' }}>
            Scan with your phone camera
          </p>
        </div>

        {/* ── URL cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          <UrlCard
            label="🎮 Web Controller"
            url={controllerUrl}
            color="#3b82f6"
            copied={copied === 'controller'}
            onCopy={() => copyToClipboard(controllerUrl, 'controller')}
          />

          <UrlCard
            label="👁️ Browser Viewer (live presentation)"
            url={viewerUrl}
            color="#a78bfa"
            copied={copied === 'viewer'}
            onCopy={() => copyToClipboard(viewerUrl, 'viewer')}
          />

          <UrlCard
            label="📡 WebSocket (for native apps)"
            url={wsUrl}
            color="#22c55e"
            copied={copied === 'ws'}
            onCopy={() => copyToClipboard(wsUrl, 'ws')}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <InfoChip label="IP Address" value={localIP}         color="#f59e0b" />
            <InfoChip label="Port"       value={String(WS_PORT)} color="#a78bfa" />
          </div>
        </div>

        {/* ── Connected devices ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: '#f9fafb', fontSize: 13,
                         fontWeight: 600 }}>
              Connected Devices
            </h3>
            <span style={{
              background: externalClients.length > 0 ? '#166534' : '#374151',
              color:      externalClients.length > 0 ? '#4ade80' : '#6b7280',
              borderRadius: 12, padding: '2px 8px',
              fontSize: 11, fontWeight: 600,
            }}>
              {externalClients.length} device{externalClients.length !== 1 ? 's' : ''}
            </span>
          </div>

          {externalClients.length === 0 ? (
            <div style={{
              background:   '#111827',
              borderRadius: 8,
              padding:      '20px',
              textAlign:    'center',
              color:        '#4b5563',
              fontSize:     12,
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📵</div>
              No devices connected yet.<br />
              Scan a QR code to connect.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {externalClients.map((client) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  icon={roleIcon[client.role]  ?? '📱'}
                  color={roleColor[client.role] ?? '#6b7280'}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Instructions ── */}
        <div style={{
          background:   'rgba(59,130,246,0.06)',
          border:       '1px solid rgba(59,130,246,0.15)',
          borderRadius: 10,
          padding:      12,
        }}>
          <h4 style={{ margin: '0 0 8px', color: '#93c5fd',
                       fontSize: 12, fontWeight: 600 }}>
            💡 How to Connect
          </h4>
          <ol style={{
            margin: 0, paddingLeft: 16,
            color: '#9ca3af', fontSize: 11, lineHeight: 1.9,
          }}>
            <li>Make sure all devices are on the <b style={{color:'#e5e7eb'}}>same WiFi</b></li>
            <li>
              <b style={{color:'#93c5fd'}}>Controller:</b>{' '}
              scan QR or open the Controller URL — navigate slides remotely
            </li>
            <li>
              <b style={{color:'#c4b5fd'}}>Viewer:</b>{' '}
              scan QR or open the Viewer URL — watch the presentation live in browser
            </li>
            <li>Connected devices appear above automatically</li>
          </ol>
        </div>

      </div>
    </div>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────────

const UrlCard: React.FC<{
  label:  string;
  url:    string;
  color:  string;
  copied: boolean;
  onCopy: () => void;
}> = ({ label, url, color, copied, onCopy }) => (
  <div style={{
    background:   '#111827',
    borderRadius: 8,
    padding:      '10px 12px',
    border:       `1px solid ${color}33`,
  }}>
    <label style={{ color: '#6b7280', fontSize: 10,
                    display: 'block', marginBottom: 5 }}>
      {label}
    </label>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <code style={{
        color:        color,
        fontSize:     11,
        flex:         1,
        overflow:     'hidden',
        textOverflow: 'ellipsis',
        whiteSpace:   'nowrap',
        fontFamily:   'monospace',
      }}>
        {url}
      </code>
      <button
        onClick={onCopy}
        style={{
          background:   copied ? '#166534' : '#1f2937',
          border:       `1px solid ${copied ? '#22c55e' : '#374151'}`,
          borderRadius: 5,
          color:        copied ? '#4ade80' : '#9ca3af',
          cursor:       'pointer',
          fontSize:     10,
          padding:      '3px 8px',
          whiteSpace:   'nowrap',
          transition:   'all 0.15s',
          fontWeight:   copied ? 600 : 400,
        }}
      >
        {copied ? '✓ Copied!' : 'Copy'}
      </button>
    </div>
  </div>
);

const InfoChip: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <div style={{
    flex: 1, background: '#111827',
    borderRadius: 8, padding: '8px 12px',
    border: `1px solid ${color}22`,
  }}>
    <label style={{ color: '#6b7280', fontSize: 10,
                    display: 'block', marginBottom: 3 }}>
      {label}
    </label>
    <code style={{ color, fontSize: 12,
                   fontFamily: 'monospace', fontWeight: 600 }}>
      {value}
    </code>
  </div>
);

const ClientRow: React.FC<{
  client: ConnectedClient;
  icon:   string;
  color:  string;
}> = ({ client, icon, color }) => (
  <div style={{
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    background:   '#111827',
    borderRadius: 8,
    padding:      '8px 12px',
    border:       `1px solid ${color}22`,
  }}>
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: '#22c55e', boxShadow: '0 0 5px #22c55e',
      flexShrink: 0,
    }} />
    <span style={{ fontSize: 15 }}>{icon}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        color: '#e5e7eb', fontSize: 12, fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {client.name}
      </div>
      <div style={{ color: '#6b7280', fontSize: 10, marginTop: 1 }}>
        Connected {new Date(client.connectedAt).toLocaleTimeString()}
      </div>
    </div>
    <span style={{
      fontSize:      9,
      color:         color,
      background:    `${color}22`,
      padding:       '2px 6px',
      borderRadius:  4,
      fontWeight:    600,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {client.role}
    </span>
  </div>
);

export default ConnectionPanel;
// // src/renderer/components/Controller/ConnectionPanel.tsx
// import React, { useState, useEffect } from 'react';
// import { QRCodeSVG } from 'qrcode.react';

// interface ConnectionPanelProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
//   isOpen,
//   onClose,
// }) => {
//   const [localIP, setLocalIP] = useState<string>('');
//   const [connectedClients, setConnectedClients] = useState<any[]>([]);
//   const wsPort = 8765;

//   useEffect(() => {
//     const fetchIP = async () => {
//       if (window.electronAPI) {
//         const ip = await window.electronAPI.getLocalIP();
//         setLocalIP(ip);
//       } else {
//         setLocalIP('localhost');
//       }
//     };
//     fetchIP();
//   }, []);

//   const connectionUrl = `ws://${localIP}:${wsPort}`;
//   const controllerUrl = `http://${localIP}:5173/#/controller`;
//   const presentationUrl = `http://${localIP}:5173/#/presentation`;

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center
//                     justify-center z-50">
//       <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-white text-lg font-bold">
//             📱 Connect Controller
//           </h2>
//           <button
//             onClick={onClose}
//             className="text-gray-400 hover:text-white text-xl"
//           >
//             ✕
//           </button>
//         </div>

//         {/* QR Code */}
//         <div className="flex justify-center mb-4">
//           <div className="bg-white p-4 rounded-lg">
//             <QRCodeSVG
//               value={JSON.stringify({
//                 wsUrl: connectionUrl,
//                 httpUrl: controllerUrl,
//               })}
//               size={200}
//               level="M"
//             />
//           </div>
//         </div>

//         {/* Connection Details */}
//         <div className="space-y-3">
//           <div className="bg-gray-700 rounded-lg p-3">
//             <label className="text-gray-400 text-xs block mb-1">
//               WebSocket Server
//             </label>
//             <div className="flex items-center gap-2">
//               <code className="text-green-400 text-sm flex-1">
//                 {connectionUrl}
//               </code>
//               <button
//                 onClick={() =>
//                   navigator.clipboard.writeText(connectionUrl)
//                 }
//                 className="text-xs bg-gray-600 px-2 py-1 rounded
//                            text-white hover:bg-gray-500"
//               >
//                 Copy
//               </button>
//             </div>
//           </div>

//           <div className="bg-gray-700 rounded-lg p-3">
//             <label className="text-gray-400 text-xs block mb-1">
//               Web Controller URL
//             </label>
//             <div className="flex items-center gap-2">
//               <code className="text-blue-400 text-sm flex-1">
//                 {controllerUrl}
//               </code>
//               <button
//                 onClick={() =>
//                   navigator.clipboard.writeText(controllerUrl)
//                 }
//                 className="text-xs bg-gray-600 px-2 py-1 rounded
//                            text-white hover:bg-gray-500"
//               >
//                 Copy
//               </button>
//             </div>
//           </div>

//           <div className="bg-gray-700 rounded-lg p-3">
//             <label className="text-gray-400 text-xs block mb-1">
//               Local IP Address
//             </label>
//             <code className="text-yellow-400 text-sm">{localIP}</code>
//           </div>

//           <div className="bg-gray-700 rounded-lg p-3">
//             <label className="text-gray-400 text-xs block mb-1">
//               Port
//             </label>
//             <code className="text-yellow-400 text-sm">{wsPort}</code>
//           </div>
//         </div>

//         {/* Connected Clients */}
//         <div className="mt-4">
//           <h3 className="text-white text-sm font-bold mb-2">
//             Connected Devices
//           </h3>
//           {connectedClients.length === 0 ? (
//             <p className="text-gray-400 text-xs">
//               No devices connected yet. Scan the QR code or enter
//               the URL on your phone/other PC.
//             </p>
//           ) : (
//             <div className="space-y-1">
//               {connectedClients.map((client) => (
//                 <div
//                   key={client.id}
//                   className="flex items-center gap-2 bg-gray-700
//                              rounded p-2"
//                 >
//                   <span className="w-2 h-2 bg-green-500 rounded-full" />
//                   <span className="text-white text-xs">
//                     {client.name}
//                   </span>
//                   <span className="text-gray-400 text-xs">
//                     ({client.role})
//                   </span>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Instructions */}
//         <div className="mt-4 bg-blue-900/30 border border-blue-800
//                         rounded-lg p-3">
//           <h4 className="text-blue-400 text-xs font-bold mb-1">
//             💡 How to Connect
//           </h4>
//           <ol className="text-gray-300 text-xs space-y-1 list-decimal
//                          list-inside">
//             <li>
//               Make sure your phone/PC is on the <b>same WiFi</b>
//             </li>
//             <li>Open the Flutter app and scan QR code</li>
//             <li>
//               Or open a browser and go to the Web Controller URL
//             </li>
//             <li>You're ready to control!</li>
//           </ol>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ConnectionPanel;