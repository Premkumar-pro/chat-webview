
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './App.css';

interface Message {
  id: string;
  role: 'user' | 'ai' | 'file';
  content: string;
  filename?: string;
  timestamp: string;
}

type VSCodeMessage =
  | { type: 'chat'; content: string }
  | { type: 'file-request'; filename: string; content?: string };

type IncomingMessage =
  | { type: 'response'; content: string }
  | { type: 'file-response'; filename: string; content: string }
  | { type: 'file-error'; filename: string; error: string; content?: string };

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const generateId = () => Date.now().toString() + Math.random().toString(36).slice(2);

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, newMessage]);
    setLoading(true);

    if (input.startsWith('@')) {
      const filename = input.slice(1).trim();
      window.vscode?.postMessage({ type: 'file-request', filename });
    } else {
      window.vscode?.postMessage({ type: 'chat', content: input });
    }

    setInput('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (base64) {
        window.vscode?.postMessage({
          type: 'file-request',
          filename: file.name,
          content: base64
        } as VSCodeMessage);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearChat = () => setMessages([]);

  const exportChat = () => {
    const text = messages
      .map(m => `[${m.timestamp}] ${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`)
      .join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const listener = (event: MessageEvent<IncomingMessage>) => {
      const { type } = event.data;
      setLoading(false);

      if (type === 'response') {
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'ai',
            content: event.data.content ?? '',
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }

      if (type === 'file-response') {
        const { filename, content } = event.data;
        const isImage = /\.(png|jpe?g|gif)$/i.test(filename || '');
        const preview = isImage
          ? `![${filename}](data:image/*;base64,${content})`
          : `\`\`\`\n${atob(content)}\n\`\`\``;

        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'file',
            filename,
            content: preview,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }

      if (type === 'file-error') {
        const { filename, error } = event.data;
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'ai',
            content: `❌ Error reading file "${filename}": ${error}`,
            timestamp: new Date().toLocaleTimeString()
          }
        ]);
      }
    };

    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="chat-outer">
     <div className="chat-header">
<span className="header-content">
  <svg width="2rem" height="2rem" viewBox="0 0 24 24" fill="none" style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}>
    <rect x="3" y="5" width="18" height="14" rx="2" stroke="#2196f3" strokeWidth="1.5"/>
    <path d="M8 10L10 12L8 14" stroke="#2196f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 10L14 12L16 14" stroke="#2196f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  Chat with AI
</span>
</div>
      <div className="chat-container">
        {/* Chat History */}
        <div className="chat-history">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              <div className="timestamp">{msg.timestamp}</div>
            </div>
          ))}

          {loading && (
            <div className="message ai">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
              <div className="timestamp">AI is typing...</div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Chat Input */}
        

        <div className="chat-input">
  <div className="input-wrapper">
    <textarea
      rows={2}
      placeholder="Type message or @filename..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }}
    />
    <label className="upload-label">
      +
      <input
        type="file"
        accept=".png,.jpg,.jpeg,.gif,.txt,.md"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />
    </label>
  </div>
  <button onClick={sendMessage}>Send</button>
  <button onClick={clearChat} title="Clear chat">🧹</button>
  <button onClick={exportChat} title="Export chat">📄</button>
</div>
   

        
      </div>
    </div>
  );
};

export default App;
