import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useLocation, Navigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

import Client from "./Client";
import Editor from "./CoderoomEditor";
import Whiteboard from "./Whiteboard";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import './CodeEditorPage.css';

// small debounce helper
function debounce(fn, ms = 800) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

const LANGUAGES = [
  "python3", "java", "cpp", "nodejs", "c", "ruby", "go", "scala",
  "bash", "sql", "pascal", "csharp", "php", "swift", "rust", "r",
];

function EditorPage() {
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  
  // UI Tab state
  const [activeTab, setActiveTab] = useState("code"); // 'code' or 'whiteboard'

  // AI state
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // refs
  const codeRef = useRef(""); // current editor code
  const socketRef = useRef(null); // single socket instance
  const socketListenersRef = useRef({}); // keep handlers so we can remove them
  const aiPromptRef = useRef(null); // ref to the AI prompt textarea

  const location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  const usernameFromParent = location.state?.state?.username;
  const usernameDirect = location.state?.username;
  const finalUsername = usernameFromParent || usernameDirect;

  // helper: emit AI request over socket (room)
  const emitAiRequestSocket = ({ prompt, code, purpose = "explain" }) => {
    if (!socketRef.current || !socketRef.current.connected) {
      setAiError("Socket not connected");
      return;
    }
    setAiLoading(true);
    setAiError(null);
    socketRef.current.emit(ACTIONS.AI_REQUEST, {
      roomId,
      prompt,
      code,
      purpose,
    });
  };

  // helper: call AI via REST (one-off)
  const callAiRest = useCallback(async ({ prompt, code, purpose = "explain" }) => {
    setAiError(null);
    setAiLoading(true);
    try {
      const res = await axios.post(`http://localhost:5000/api/ai/ask`, {
        prompt,
        code,
        purpose,
      });
      const answer = res.data.answer || JSON.stringify(res.data);
      setAiAnswer(answer);
      setAiLoading(false);
      return answer;
    } catch (err) {
      console.error("AI REST error:", err?.response?.data || err.message);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || "AI failed";
      setAiError(msg);
      setAiLoading(false);
      throw err;
    }
  }, []);

  // Debounced REST wrapper to avoid spamming backend
  const debouncedCallAiRestRef = useRef(null);
  if (!debouncedCallAiRestRef.current) {
    debouncedCallAiRestRef.current = debounce(async (payload) => {
      try {
        await callAiRest(payload);
      } catch (e) {
        // already handled inside callAiRest
      }
    }, 900);
  }
  const debouncedCallAiRest = debouncedCallAiRestRef.current;

  useEffect(() => {
    if (!location.state) return; // if no state, we won't init

    let isMounted = true;
    const currentListeners = socketListenersRef.current;

    const handleErrors = (err) => {
      console.error("Socket connection error:", err);
      if (!isMounted) return;
      toast.error("Socket connection failed. Try again later.");
      navigate("/chatroom");
    };

    const init = async () => {
      try {
        // reuse existing socket if already created by another component
        let socket = socketRef.current;
        if (!socket || !socket.connected) {
          socket = await initSocket(); // initSocket should be idempotent and return shared instance
          socketRef.current = socket;
        }

        if (!isMounted) return;

        // ensure we don't re-attach handlers if they already exist
        if (!currentListeners._attached) {
          // AI_RESPONSE handler
          currentListeners[ACTIONS.AI_RESPONSE] = (payload) => {
            // payload shape: { socketId, status, answer, error }
            if (!isMounted) return;
            if (payload.status === "started") {
              setAiLoading(true);
              return;
            }
            if (payload.status === "done") {
              setAiAnswer(payload.answer || "");
              setAiLoading(false);
              setAiError(null);
              return;
            }
            if (payload.status === "error") {
              setAiError(payload.error || "AI error");
              setAiLoading(false);
              return;
            }
          };

          // JOINED handler
          currentListeners[ACTIONS.JOINED] = ({ clients, username, socketId }) => {
            if (!isMounted) return;
            if (username && username !== finalUsername) toast.success(`${username} joined the room.`);
            setClients(clients || []);
            // sync code to the newly joined client
            try {
              socketRef.current.emit(ACTIONS.SYNC_CODE, {
                code: typeof codeRef.current === "string" ? codeRef.current : "",
                socketId,
              });
            } catch (e) {
              console.warn("Failed to SYNC_CODE", e);
            }
          };

          // DISCONNECTED handler
          currentListeners[ACTIONS.DISCONNECTED] = ({ socketId, username }) => {
            if (!isMounted) return;
            if (username) toast.success(`${username} left the room`);
            setClients(prev => prev.filter(c => c.socketId !== socketId));
          };

          // attach handlers once
          socket.on(ACTIONS.AI_RESPONSE, currentListeners[ACTIONS.AI_RESPONSE]);
          socket.on(ACTIONS.JOINED, currentListeners[ACTIONS.JOINED]);
          socket.on(ACTIONS.DISCONNECTED, currentListeners[ACTIONS.DISCONNECTED]);

          // attach generic socket error/log handlers (only once)
          socket.on("connect_error", handleErrors);
          socket.on("error", (err) => console.error("Socket error:", err));

          currentListeners._attached = true;
        }

        // emit JOIN after handlers attached
        socket.emit(ACTIONS.JOIN, {
          roomId,
          username: finalUsername,
        });
      } catch (err) {
        handleErrors(err);
      }
    };

    init();

    return () => {
      isMounted = false;
      // remove only attached handlers (do not disconnect global socket)
      const socket = socketRef.current;
      if (socket && socket.connected && currentListeners._attached) {
        try {
          socket.off(ACTIONS.AI_RESPONSE, currentListeners[ACTIONS.AI_RESPONSE]);
          socket.off(ACTIONS.JOINED, currentListeners[ACTIONS.JOINED]);
          socket.off(ACTIONS.DISCONNECTED, currentListeners[ACTIONS.DISCONNECTED]);
          socket.off("connect_error", handleErrors);
          socket.off("error");
        } catch (e) {
          console.warn("Error removing socket handlers:", e);
        }
        // keep socket running for other pages - do not call socket.disconnect() here
        currentListeners._attached = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, finalUsername, navigate, location.state]);

  if (!location.state) return <Navigate to="/chatroom" replace />;

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success("Room ID copied");
    } catch {
      toast.error("Failed to copy Room ID");
    }
  };

  const leaveRoom = () => navigate("/chatroom");

  // run code -> compile endpoint, show aiSuggestion if returned
  const runCode = async () => {
    setIsCompiling(true);
    setOutput("");
    setAiAnswer("");
    setAiError(null);
    try {
      const response = await axios.post(`http://localhost:5000/compile`, {
        code: codeRef.current,
        language: selectedLanguage,
      });

      // if backend returns structured output and aiSuggestion, handle both:
      const data = response.data;
      if (data.aiSuggestion) {
        // Show AI suggestion prominently
        setAiAnswer(data.aiSuggestion);
        setOutput(data.output || "Compiler output available (see AI suggestion).");
      } else if (data.output) {
        setOutput(typeof data.output === "string" ? data.output : JSON.stringify(data.output, null, 2));
      } else {
        setOutput(JSON.stringify(data));
      }
    } catch (err) {
      // If server returned error object, display it and possibly AI suggestion included in body
      const body = err?.response?.data;
      if (body?.aiSuggestion) {
        setAiAnswer(body.aiSuggestion);
        setOutput(body.output || body.compileError || "Compile error — AI suggested a fix.");
      } else {
        setOutput(body?.error || "An error occurred");
      }
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => setIsCompileWindowOpen(prev => !prev);

  // UI handlers for AI
  const handleAskAiRest = () => {
    const prompt = aiPromptRef.current?.value?.trim();
    if (!prompt) return toast.error("Enter a prompt");
    debouncedCallAiRest({ prompt, code: codeRef.current, purpose: "explain" });
  };

  const handleAskAiSocket = () => {
    const prompt = aiPromptRef.current?.value?.trim();
    if (!prompt) return toast.error("Enter a prompt");
    emitAiRequestSocket({ prompt, code: codeRef.current, purpose: "fix" });
  };

  return (
    <div className="code-editor-layout">
      {/* Left Sidebar */}
      <div className="sidebar left-sidebar">
        <div className="sidebar-header">
          <img src="/images/codecast.png" alt="Logo" />
          <p className="room-id">Room: {roomId}</p>
        </div>
        
        <div className="sidebar-actions">
          <button className="sidebar-btn" onClick={copyRoomId}>Copy Room ID</button>
          <button className="sidebar-btn danger" onClick={leaveRoom}>Leave Room</button>
        </div>

        <div className="client-list-container">
          <p className="list-title">Members ({clients.length})</p>
          <div className="client-list">
            {clients.map(client => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-workspace">
        {/* Top Header / Tabs */}
        <div className="workspace-header">
          <div className="workspace-tabs">
            <button 
              className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              Coding Editor
            </button>
            <button 
              className={`tab-btn ${activeTab === 'whiteboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('whiteboard')}
            >
              System Design
            </button>
          </div>

          {activeTab === 'code' && (
            <div className="language-selector">
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <button 
                className="compile-toggle-btn" 
                onClick={toggleCompileWindow}
              >
                {isCompileWindowOpen ? "Hide Output" : "Show Output"}
              </button>
            </div>
          )}
        </div>

        {/* Active Tool Area */}
        <div className="active-tool-area">
          {/* Code Editor View */}
          <div 
            className="tool-container code-tool-container" 
            style={{ display: activeTab === 'code' ? 'flex' : 'none' }}
          >
            <div className="editor-wrapper">
              <Editor
                socketRef={socketRef}
                roomId={roomId}
                onCodeChange={code => { codeRef.current = code ?? ""; }}
              />
            </div>
            
            {/* Compiler Output Drawer */}
            {isCompileWindowOpen && (
              <div className="compiler-drawer">
                <div className="compiler-header">
                  <span>Terminal ({selectedLanguage})</span>
                  <button className="run-cmd-btn" onClick={runCode} disabled={isCompiling}>
                    {isCompiling ? "Running..." : "Run Code"}
                  </button>
                </div>
                <pre className="compiler-output">
                  {output || "Output will appear here after compilation"}
                </pre>
              </div>
            )}
          </div>

          {/* Whiteboard View */}
          <div 
            className="tool-container whiteboard-tool-container" 
            style={{ display: activeTab === 'whiteboard' ? 'block' : 'none' }}
          >
            {socketRef.current ? (
              <Whiteboard socketRef={socketRef} roomId={roomId} />
            ) : (
              <div className="loading-state">Connecting to whiteboard...</div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sidebar: AI Assistant */}
      <div className="sidebar right-sidebar ai-sidebar">
        <h3 className="ai-title">✨ AI Assistant</h3>
        <div className="ai-chat-history">
           {aiAnswer ? (
              <div className="ai-message response">
                <pre>{aiAnswer}</pre>
                {/* Useful if AI suggested code during compile error */}
                {isCompileWindowOpen && activeTab === 'code' && (
                   <button className="use-suggestion-btn" onClick={() => {
                     codeRef.current = aiAnswer;
                     toast.success("AI suggestion copied. Paste into the editor.");
                   }}>
                     Copy Code
                   </button>
                )}
              </div>
            ) : (
              <div className="ai-welcome">
                 <p>Ask a question or request a code review to get started.</p>
              </div>
            )}
            
            {aiError && (
              <div className="ai-message error">
                <p>{aiError}</p>
              </div>
            )}
            
            {aiLoading && (
              <div className="ai-message loading">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
        </div>

        <div className="ai-input-area">
          <textarea
            ref={aiPromptRef}
            placeholder="Ask to explain, fix, or optimize..."
            rows="3"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAskAiRest();
              }
            }}
          />
          <div className="ai-actions">
            <button className="ai-btn normal" onClick={handleAskAiRest} disabled={aiLoading}>
              Ask
            </button>
            <button className="ai-btn magic" onClick={handleAskAiSocket} disabled={aiLoading || !roomId}>
              Fix Bug
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorPage;
