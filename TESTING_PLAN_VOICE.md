# Testing Plan for ChatGPT-Style Voice Integration

## Phase 1: System Prompt Testing ✅ READY

### Test 1: Basic Chat with New Prompt
**Objective**: Verify the new RakshaAI system prompt is working correctly

**Steps**:
1. Authenticate and open chat
2. Ask: "How do I apply for Aadhaar?"
3. Verify response follows new structured format:
   - Starts with acknowledgment
   - Provides step-by-step instructions
   - Includes official portal URLs
   - Mentions helpline numbers
   - Shows empathetic, professional tone
   - Uses "RakshaAI" persona characteristics

**Expected Behavior**:
- Response should be structured with numbered steps
- Should reference .gov.in portals
- Should warn about privacy (never share Aadhaar with AI)
- Should be 150-300 words (concise but complete)

---

## Phase 2: Voice Quality Testing ✅ READY

### Test 2: TTS Voice Quality
**Objective**: Verify the upgraded voice (shimmer) sounds natural and female

**Steps**:
1. Authenticate and open chat
2. Send a message: "Tell me about PAN card application"
3. Click the TTS (speaker) button on AI response
4. Listen to the voice quality

**Expected Behavior**:
- Voice should be female
- Should sound natural (not robotic)
- Should be clear and easy to understand
- Should have proper emphasis and intonation

---

## Phase 3: Inline Voice Conversation Testing 🔴 CRITICAL

### Test 3: Start Voice Conversation
**Objective**: Verify voice mode can be initiated from chat interface

**Steps**:
1. Authenticate and open chat
2. Look for purple gradient phone button at bottom right (next to send button)
3. Click the voice button
4. Browser should request microphone permission
5. Grant permission

**Expected Behavior**:
- Purple/blue gradient panel appears above input area
- Shows "Listening..." with pulsing purple indicator
- Microphone icon visible in the center
- "Send" and "End Call" buttons visible

**Potential Issues**:
- Microphone permission denied → Show error message
- MediaRecorder not supported → Fallback to text chat

---

### Test 4: Single Voice Turn
**Objective**: Test one complete voice interaction cycle

**Steps**:
1. Start voice conversation (Test 3)
2. Speak clearly: "What is Aadhaar?"
3. Wait for auto-stop (10 seconds) OR click "Send" button
4. Observe UI changes

**Expected Behavior**:
1. **Listening → Thinking transition**:
   - Purple indicator stops pulsing
   - Status changes to "Processing..."
   - Yellow indicator appears

2. **Thinking → Speaking transition**:
   - Status changes to "RakshaAI is speaking..."
   - Blue pulsing indicator appears
   - Two new messages appear in chat:
     - User message with 🎤 Voice badge: "What is Aadhaar?"
     - AI message with 🎤 Voice badge: [Response text]

3. **Audio Playback**:
   - AI response plays automatically
   - Voice should be female (shimmer)
   - Should be clear and natural

4. **Speaking → Listening transition**:
   - After audio finishes, automatically returns to "Listening..."
   - Purple pulsing indicator returns
   - Ready for next turn

**Potential Issues**:
- Empty audio blob → Should restart listening
- Transcription fails → Should show error and end call
- Audio playback fails → Should continue to next listening cycle
- Backend error → Should show alert and end call

---

### Test 5: Continuous Multi-Turn Conversation
**Objective**: Verify the conversation loop works continuously

**Steps**:
1. Start voice conversation
2. Ask: "How do I apply for Aadhaar?"
3. Wait for AI response to finish
4. Immediately ask follow-up: "What documents do I need?"
5. Wait for response
6. Ask another follow-up: "How long does it take?"
7. Repeat for 5-6 turns

**Expected Behavior**:
- Each turn should complete successfully
- Conversation context should be maintained
- No manual restarts needed between turns
- Audio should not overlap or cut off
- UI should smoothly transition between states
- All messages should appear in chat history

**Potential Issues**:
- Loop breaks after first turn → Check `isInVoiceModeRef.current`
- Context not maintained → Check conversation_id passing
- Audio overlaps → Check if previous audio is stopped
- Microphone doesn't restart → Check cleanup in audio.onended

---

### Test 6: Manual Send During Listening
**Objective**: Verify user can send audio before 10-second timeout

**Steps**:
1. Start voice conversation
2. Speak for 2-3 seconds
3. Click "Send" button immediately
4. Verify audio is processed

**Expected Behavior**:
- Recording stops immediately when "Send" is clicked
- Audio is sent to backend for processing
- Normal processing flow continues

---

### Test 7: End Voice Conversation
**Objective**: Verify cleanup when ending voice mode

**Steps**:
1. Start voice conversation
2. Complete 2-3 turns
3. Click "End Call" button
4. Observe cleanup

**Expected Behavior**:
- Voice mode panel disappears
- Regular input controls reappear
- Microphone indicator turns off (browser shows mic is released)
- Any playing audio stops
- All voice messages remain visible in chat history
- Backend call session is ended

**Potential Issues**:
- Microphone not released → Check streamRef.current.getTracks().forEach(stop)
- Audio keeps playing → Check voiceAudioRef.current.pause()
- Memory leak → Verify all refs are cleaned up

---

## Phase 4: Integration Testing 🟡 HIGH PRIORITY

### Test 8: Voice with Document Context
**Objective**: Verify voice conversation can reference uploaded documents

**Steps**:
1. Upload a legal notice or certificate image
2. Get analysis from AI
3. Start voice conversation
4. Ask via voice: "What action do I need to take?"
5. Verify AI references the document in voice response

**Expected Behavior**:
- AI should recall document context from chat history
- Voice response should reference specific document details
- No need to re-upload document

---

### Test 9: Switch Between Text and Voice
**Objective**: Verify seamless switching between modes

**Steps**:
1. Send 2 text messages
2. Start voice conversation
3. Have 2 voice turns
4. End voice call
5. Send 2 more text messages
6. Start voice again

**Expected Behavior**:
- All messages (text and voice) appear in same chat thread
- Context is maintained across mode switches
- No confusion in conversation history
- Voice badges only on voice messages

---

## Phase 5: Edge Cases & Error Handling

### Test 10: Network Issues
- Disconnect network during voice turn
- Expected: Error message, graceful degradation

### Test 11: Long AI Response
- Ask complex question that generates long response
- Expected: Full response text visible, audio plays completely

### Test 12: Browser Compatibility
- Test on Chrome, Firefox, Safari, Edge
- Expected: Works on all browsers (with mime type fallbacks)

### Test 13: Multiple Concurrent Users
- Open chat in two browser tabs
- Start voice in both
- Expected: Each session is independent

---

## Testing Checklist Summary

### Before Testing:
- [ ] Backend is running (`sudo supervisorctl status`)
- [ ] Frontend is running
- [ ] No console errors in browser
- [ ] Microphone available and working

### Core Features to Verify:
- [x] New RakshaAI system prompt implemented
- [x] Voice upgraded to shimmer (tts-1-hd)
- [x] Purple gradient voice button visible
- [ ] Voice mode UI displays correctly
- [ ] Single voice turn works
- [ ] Continuous conversation loop works
- [ ] End call cleanup works
- [ ] Voice messages show badges
- [ ] Context maintained across turns
- [ ] Document context accessible in voice mode
- [ ] Text/voice mode switching seamless

### Performance Metrics:
- Transcription latency: < 5 seconds
- Response generation: < 10 seconds
- TTS generation: < 3 seconds
- Total turn time: < 20 seconds
- Audio quality: Clear, natural, no artifacts

---

## Known Limitations

1. **Audio Chunk Size**: 10 seconds maximum per turn (configurable)
2. **Browser Support**: Safari has limited MediaRecorder support
3. **Network Dependency**: Requires stable internet for STT/TTS
4. **Microphone Permission**: User must grant permission
5. **Context Window**: Very long conversations may lose early context

---

## Success Criteria

✅ **Phase 1 (System Prompt)**: 
- New prompt generates structured, empathetic responses

✅ **Phase 2 (Voice Quality)**: 
- Shimmer voice sounds natural and female

🎯 **Phase 3 (Voice Conversation)**: 
- Continuous loop works for 5+ turns
- UI updates correctly for all states
- Cleanup works without memory leaks

🎯 **Phase 4 (Integration)**: 
- Voice works with document context
- Text/voice switching is seamless

---

## Testing Status: READY FOR USER TESTING

**Last Updated**: Implementation complete
**Next Step**: User to test voice conversation flow with authentication
