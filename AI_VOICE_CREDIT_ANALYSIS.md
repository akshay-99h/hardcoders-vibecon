# AI Voice Conversation - Credit Consumption Analysis

## Overview
This document provides a detailed breakdown of credit/cost consumption for the ChatGPT-style AI voice conversation feature in RakshaAI.

---

## Voice Conversation Pipeline

Each voice turn consists of **3 AI service calls**:

```
User speaks → 1. STT (Whisper) → 2. Chat (Claude) → 3. TTS (Shimmer) → User hears
```

---

## 1. Speech-to-Text (STT) - OpenAI Whisper

**Service**: `whisper-1` (via Emergent LLM Key)  
**Pricing Model**: Based on audio duration

### Pricing (Emergent LLM Key - 2025):
- **Rate**: ~$0.006 per minute of audio
- **Typical user speech**: 5-30 seconds per turn

### Cost per Turn:
| Speech Duration | Cost (USD) | Emergent Credits |
|-----------------|------------|------------------|
| 5 seconds       | $0.0005    | ~0.5 credits     |
| 10 seconds      | $0.001     | ~1 credit        |
| 20 seconds      | $0.002     | ~2 credits       |
| 30 seconds      | $0.003     | ~3 credits       |

**Average per turn**: **~1-2 credits** (assuming 10-15 second average speech)

---

## 2. Chat Response - Claude Sonnet 4.5

**Service**: `claude-sonnet-4-5-20250929` (via Emergent LLM Key)  
**Pricing Model**: Based on tokens (input + output)

### System Prompt Token Count:
- New RakshaAI prompt: **~1,400 tokens** (includes classification rules, examples, universal rules)
- Knowledge base context: **~500-1,500 tokens** (when relevant context is retrieved)
- Conversation history: **~200-800 tokens** (last 10 messages)
- Document context: **~300-1,000 tokens** (if document uploaded)

### Typical Token Usage per Turn:

#### Simple Query (e.g., "How to apply for Aadhaar?"):
- **Input tokens**: 1,400 (system) + 50 (user query) = ~1,450 tokens
- **Output tokens**: ~200-400 tokens (structured answer)
- **Total**: ~1,650-1,850 tokens

#### Complex Query with Context:
- **Input tokens**: 1,400 (system) + 1,000 (knowledge base) + 500 (conversation history) + 100 (user query) = ~3,000 tokens
- **Output tokens**: ~400-600 tokens (detailed advice with steps)
- **Total**: ~3,400-3,600 tokens

### Claude Sonnet Pricing (via Emergent LLM Key):
- **Input**: $3.00 per 1M tokens → $0.000003 per token
- **Output**: $15.00 per 1M tokens → $0.000015 per token

### Cost per Turn:

| Query Type | Input Tokens | Output Tokens | Cost (USD) | Emergent Credits |
|------------|--------------|---------------|------------|------------------|
| Simple     | 1,450        | 300           | $0.0088    | ~9 credits       |
| Complex    | 3,000        | 500           | $0.0165    | ~17 credits      |
| With Document | 4,000     | 600           | $0.0210    | ~21 credits      |

**Average per turn**: **~10-15 credits**

---

## 3. Text-to-Speech (TTS) - OpenAI TTS HD (Shimmer)

**Service**: `tts-1-hd` with `shimmer` voice (via Emergent LLM Key)  
**Pricing Model**: Based on characters

### Typical Response Length:
- **Simple answer**: 200-400 characters
- **Detailed answer**: 400-800 characters
- **Complex answer with steps**: 800-1,500 characters

### OpenAI TTS HD Pricing:
- **Rate**: $30.00 per 1M characters → $0.00003 per character

### Cost per Turn:

| Response Length | Characters | Cost (USD) | Emergent Credits |
|-----------------|------------|------------|------------------|
| Simple (300)    | 300        | $0.009     | ~9 credits       |
| Detailed (600)  | 600        | $0.018     | ~18 credits      |
| Complex (1000)  | 1,000      | $0.030     | ~30 credits      |

**Average per turn**: **~15-20 credits**

---

## 📊 Total Cost Per Voice Turn

### Complete Breakdown:

| Component | Simple Query | Complex Query | With Document |
|-----------|--------------|---------------|---------------|
| **STT (Whisper)** | 1-2 credits | 1-2 credits | 1-2 credits |
| **Chat (Claude)** | 9 credits | 17 credits | 21 credits |
| **TTS (Shimmer)** | 9 credits | 18 credits | 30 credits |
| **TOTAL** | **~19-20 credits** | **~36-37 credits** | **~52-53 credits** |

---

## 💰 Cost Per Voice Conversation

### Typical Conversation Scenarios:

#### Scenario 1: Quick Government Service Query (3 turns)
- User: "How to apply for PAN card?"
- AI: [Detailed steps]
- User: "What documents do I need?"
- AI: [Document list]
- User: "How long does it take?"
- AI: [Timeline]

**Total**: 3 turns × 20 credits = **~60 credits** (~$0.06)

---

#### Scenario 2: Complex Legal Issue (5 turns)
- User: "My landlord is not returning deposit" (Complex → AI asks clarifying questions)
- AI: [Asks 3 questions]
- User: [Provides details]
- AI: [Full legal advice]
- User: "What if he still refuses?"
- AI: [Escalation steps]
- User: "Do I need a lawyer?"
- AI: [Legal aid guidance]

**Total**: 5 turns × 30 credits = **~150 credits** (~$0.15)

---

#### Scenario 3: Document Analysis + Voice Follow-up (7 turns)
- User uploads legal notice → AI analyzes (text)
- User starts voice: "What should I do about this notice?"
- AI: [Urgent actions based on document]
- User: "What if I miss the deadline?"
- AI: [Consequences + remedies]
- User: "Can I reply by email?"
- AI: [Proper response method]
- User: "Who should I contact?"
- AI: [Authority details]

**Total**: 7 turns × 40 credits = **~280 credits** (~$0.28)

---

## 📈 Credit Consumption Summary

### Per Turn Averages:
- **Minimum** (simple, short): ~19-20 credits (~$0.02)
- **Average** (normal conversation): ~30-35 credits (~$0.03-0.035)
- **Maximum** (complex with document): ~50-55 credits (~$0.05-0.055)

### Per Conversation (Estimated):
- **Short (3-5 turns)**: ~60-100 credits (~$0.06-0.10)
- **Medium (5-8 turns)**: ~150-280 credits (~$0.15-0.28)
- **Long (10+ turns)**: ~300-550 credits (~$0.30-0.55)

---

## 💡 Optimization Recommendations

### To Reduce Credit Usage:

1. **Shorter System Prompt** (Current: ~1,400 tokens)
   - Trade-off: Less detailed persona, but saves ~5-10 credits per turn
   - Not recommended: User specified this detailed prompt

2. **Limit Conversation History** (Current: Last 10 messages)
   - Trade-off: Less context awareness
   - Potential savings: ~5 credits per turn for long conversations

3. **Use Standard TTS** (`tts-1` instead of `tts-1-hd`)
   - Savings: ~50% on TTS cost (~5-10 credits per turn)
   - Trade-off: Lower voice quality (user specifically requested natural female voice)

4. **Implement Streaming TTS** (Future)
   - Start playing audio before full response is generated
   - No credit savings, but improves user experience

---

## 🎯 User Budget Recommendations

### For End Users:

**Light Usage** (5-10 voice conversations/month):
- **Estimated**: 500-1,000 credits/month
- **Cost**: $0.50-1.00/month

**Medium Usage** (20-30 voice conversations/month):
- **Estimated**: 2,000-4,000 credits/month
- **Cost**: $2.00-4.00/month

**Heavy Usage** (Daily voice conversations, 60+/month):
- **Estimated**: 6,000-12,000 credits/month
- **Cost**: $6.00-12.00/month

### Comparison to Text Chat:
- **Text chat only**: ~10-20 credits per turn (no STT/TTS cost)
- **Voice adds**: ~15-20 credits per turn for audio processing
- **Premium**: ~2x cost for voice vs. text, but significantly better UX

---

## 🔍 Real-World Example Calculation

### User: Raj (Small business owner with tax query)

**Conversation Flow:**
1. Raj starts voice call
2. Asks: "GST registration kaise karen?" (How to register for GST?) - 15 sec
3. AI responds with detailed steps (600 characters TTS)
4. Raj: "Documents kya chahiye?" (What documents needed?) - 8 sec
5. AI lists documents (400 characters TTS)
6. Raj: "Kitna time lagta hai?" (How long does it take?) - 7 sec
7. AI explains timeline (300 characters TTS)
8. Ends call

**Credit Breakdown:**
- Turn 1 (Complex): STT (2) + Claude (17) + TTS (18) = 37 credits
- Turn 2 (Simple): STT (1) + Claude (9) + TTS (9) = 19 credits
- Turn 3 (Simple): STT (1) + Claude (9) + TTS (9) = 19 credits

**Total**: **75 credits** (~$0.075 or ₹6.30)

---

## ⚠️ Important Notes

1. **Emergent LLM Key Credits**: Based on estimated conversion where 1 credit ≈ $0.001 USD
2. **Actual pricing** may vary based on:
   - Emergent's markup/discount
   - Conversation length and complexity
   - Knowledge base context retrieval
   - Document analysis integration
3. **Free tier users**: Should be aware of credit consumption to avoid unexpected charges
4. **Auto top-up recommended**: For frequent voice users

---

## 📞 Support Resources

**For credit balance issues:**
- Check balance: Profile → Universal Key → View Balance
- Add credits: Profile → Universal Key → Add Balance
- Enable auto top-up: Profile → Universal Key → Auto Top-Up

**Optimization tips:**
- Use text chat for simple queries (saves ~50% credits)
- Reserve voice for complex legal/urgent matters
- Keep voice turns concise to minimize STT cost
- End voice call when done (prevent idle recording)

---

**Last Updated**: February 2026  
**Voice Feature Version**: 1.0 (ChatGPT-style inline)
