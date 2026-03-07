export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { images } = req.body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    if (images.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 images allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            ...images,
            {
              type: "text",
              text: `Analyze these textbook pages and create a comprehensive set of revision questions for Indian students preparing for exams. Generate EXACTLY:

- 20 Fill in the Blanks questions
- 20 Name the Following questions
- 20 True or False questions
- 10 Short Answer questions (2-3 sentences)
- 10 Long Answer questions (detailed responses)
- 10 Analytical/Critical Thinking questions

Format your response as JSON with this structure:
{
  "fillInTheBlanks": [{"question": "...", "answer": "..."}],
  "nameTheFollowing": [{"question": "...", "answer": "..."}],
  "trueOrFalse": [{"question": "...", "answer": "..."}],
  "shortAnswer": [{"question": "...", "answer": "..."}],
  "longAnswer": [{"question": "...", "answer": "..."}],
  "analytical": [{"question": "...", "answer": "..."}]
}

Make questions relevant to Indian curriculum and exam patterns. Be thorough and educational. Return ONLY the JSON, no other text.`
            }
          ]
        }],
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Claude API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to generate questions',
        details: errorData 
      });
    }

    const data = await response.json();
    const textContent = data.content.find(item => item.type === "text")?.text || "";
    
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const questions = JSON.parse(jsonMatch[0]);
      return res.status(200).json(questions);
    }
    
    throw new Error("Invalid response format from Claude");

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
