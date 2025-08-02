// packages/frontend/src/components/ChatPlayground.tsx
import React, { useState, useRef, useEffect } from 'react';
import { trpc } from '../hooks/useTRPC'; // Updated import
import { MessageSquare, Send, Settings, Play, User, Bot, Wrench } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: any[];
}

interface ChatResponse {
  id: string;
  role: 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: any[];
}

export default function ChatPlayground() {
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentConfig, setShowAgentConfig] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: namespaces } = trpc.namespaces.list.useQuery();
  const { data: tools } = trpc.chat.getTools.useQuery({ namespace: selectedNamespace });
  
  const createSession = trpc.chat.createSession.useMutation({
    onError: (error) => {
      console.error('Session creation error:', error);
      alert(`Failed to create session: ${error.message}`);
    }
  });
  
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onError: (error) => {
      console.error('Send message error:', error);
      alert(`Failed to send message: ${error.message}`);
    }
  });

  const [agentConfig, setAgentConfig] = useState({
    systemPrompt: 'You are a helpful AI assistant with access to various tools. Use them when appropriate to help the user.',
    enabledTools: [] as string[],
    temperature: 0.7,
    maxTokens: 1000
  });

  useEffect(() => {
    if (tools?.tools) {
      setAgentConfig(prev => ({
        ...prev,
        enabledTools: tools.tools.map((tool: any) => tool.name)
      }));
    }
  }, [tools]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateSession = async () => {
    try {
      const session = await createSession.mutateAsync({
        name: `Chat Session ${new Date().toLocaleTimeString()}`,
        namespace: selectedNamespace,
        agentConfig
      });
      setCurrentSession(session.id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !currentSession) return;

    const userMessage: Message = {
      id: Math.random().toString(36),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: ChatResponse = await sendMessage.mutateAsync({
        sessionId: currentSession,
        message: inputMessage,
        namespace: selectedNamespace
      });

      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.timestamp),
        ...(response.toolCalls && { toolCalls: response.toolCalls })
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Math.random().toString(36),
        role: 'assistant',
        content: 'Sorry, there was an error processing your message.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-sm border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Chat Playground</h2>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700">Namespace</label>
            <select
              value={selectedNamespace}
              onChange={(e) => setSelectedNamespace(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              {namespaces?.map((ns: { id: string; name: string; }) => (
                <option key={ns.id} value={ns.id}>{ns.name}</option>
              ))}
            </select>
          </div>
          {!currentSession ? (
            <button
              onClick={handleCreateSession}
              disabled={createSession.isLoading}
              className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {createSession.isLoading ? 'Creating...' : 'Start New Session'}
            </button>
          ) : (
            <div className="mt-3 text-sm text-green-600 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2" />
              Session Active
            </div>
          )}
        </div>

        {/* Agent Configuration */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Agent Configuration</h3>
              <button
                onClick={() => setShowAgentConfig(!showAgentConfig)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {showAgentConfig && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700">System Prompt</label>
                  <textarea
                    value={agentConfig.systemPrompt}
                    onChange={(e) => setAgentConfig({ ...agentConfig, systemPrompt: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Temperature</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={agentConfig.temperature}
                      onChange={(e) => setAgentConfig({ ...agentConfig, temperature: parseFloat(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Max Tokens</label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      step="100"
                      value={agentConfig.maxTokens}
                      onChange={(e) => setAgentConfig({ ...agentConfig, maxTokens: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Available Tools */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Available Tools</h3>
              {tools?.tools && tools.tools.length > 0 ? (
                <div className="space-y-2">
                  {tools.tools.map((tool: any) => (
                    <div key={tool.name} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <Wrench className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-xs font-medium text-gray-900">{tool.name}</div>
                          <div className="text-xs text-gray-500 truncate">{tool.description}</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={agentConfig.enabledTools.includes(tool.name)}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setAgentConfig(prev => ({
                            ...prev,
                            enabledTools: enabled
                              ? [...prev.enabledTools, tool.name]
                              : prev.enabledTools.filter(t => t !== tool.name)
                          }));
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Wrench className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-xs text-gray-500">No tools available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {currentSession ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-3xl flex space-x-3">
                    {message.role !== 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`${message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-gray-900 shadow-sm border'
                    } rounded-lg px-4 py-2`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <div className="text-xs text-gray-500">
                            Tools used: {message.toolCalls.map(call => call.name).join(', ')}
                          </div>
                        </div>
                      )}
                      <div className="text-xs mt-1 opacity-70">
                        {message.timestamp instanceof Date 
                          ? message.timestamp.toLocaleTimeString() 
                          : new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-3xl flex space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white text-gray-900 shadow-sm border rounded-lg px-4 py-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 resize-none focus:ring-blue-500 focus:border-blue-500"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || !currentSession}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Active Session</h3>
              <p className="mt-2 text-sm text-gray-500">
                Select a namespace and start a new chat session to begin.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}