import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon, Button } from 'semantic-ui-react'
import { getCategoryHexColor } from '../utils'
import './Chat.css'

const API_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5050/api/chat'
    : `${window.location.origin}/api/chat`

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: "Hi there! I'm the Wyoming Youth Resource Navigator. I can help you find services and resources across Wyoming — things like counseling, housing, food assistance, job programs, and more.\n\nWhat are you looking for today?",
  guids: [],
}

function Chat({ listings }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const listingMap = {}
  if (listings) {
    listings.forEach(l => { listingMap[l.guid] = l })
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const history = updated
        .filter(m => m !== WELCOME_MESSAGE)
        .map(m => ({ role: m.role, content: m.content }))
        .slice(-10)

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      const data = await res.json()

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message || "I'm not sure how to help with that. Could you tell me more?",
        guids: data.recommendedGuids || [],
        isCrisis: data.isCrisis || false,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment, or browse the map directly.",
        guids: [],
      }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const viewOnMap = (guids) => {
    if (!guids || guids.length === 0) return
    navigate(`/?chat_recs=${guids.join(',')}`)
  }

  return (
    <div className="chat-page">
      <div className="chat-safety-banner">
        <Icon name="info circle" />
        <span>
          This tool helps you find resources. It does not provide medical advice.
          If you are in crisis, call <a href="tel:988"><strong>988</strong></a> or <a href="tel:911"><strong>911</strong></a>.
        </span>
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble-row ${msg.role}`}>
            {msg.role === 'assistant' && (
              <div className="chat-avatar">
                <Icon name="map" />
              </div>
            )}
            <div className={`chat-bubble ${msg.role} ${msg.isCrisis ? 'crisis' : ''}`}>
              <MessageContent text={msg.content} />
              {msg.guids && msg.guids.length > 0 && (
                <div className="chat-recommendations">
                  {msg.guids.map(guid => {
                    const listing = listingMap[guid]
                    if (!listing) return null
                    const parentCat = listing.category ? listing.category.split(': ')[0] : ''
                    const hexColor = getCategoryHexColor(parentCat)
                    return (
                      <div key={guid} className="chat-rec-card" style={{ borderLeftColor: hexColor }}>
                        <div className="chat-rec-name">{listing.full_name}</div>
                        {listing.parent_organization && listing.parent_organization !== listing.full_name && (
                          <div className="chat-rec-org">{listing.parent_organization}</div>
                        )}
                        <div className="chat-rec-meta">
                          {parentCat && <span className="chat-rec-cat" style={{ color: hexColor }}>{parentCat}</span>}
                          {listing.city && <span className="chat-rec-city"><Icon name="map marker alternate" size="small" />{listing.city}</span>}
                        </div>
                      </div>
                    )
                  })}
                  <button className="chat-view-map-btn" onClick={() => viewOnMap(msg.guids)}>
                    <Icon name="map outline" /> View on Map
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-row assistant">
            <div className="chat-avatar">
              <Icon name="map" />
            </div>
            <div className="chat-bubble assistant">
              <div className="chat-typing">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Describe what you're looking for..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={1000}
          rows={1}
          disabled={loading}
        />
        <Button
          icon="send"
          color="blue"
          className="chat-send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        />
      </div>
    </div>
  )
}

function MessageContent({ text }) {
  if (!text) return null
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <div className="chat-text">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return part.split('\n').map((line, j, arr) => (
          <React.Fragment key={`${i}-${j}`}>
            {line}
            {j < arr.length - 1 && <br />}
          </React.Fragment>
        ))
      })}
    </div>
  )
}

export default Chat
