const fs = require('fs').promises;
const path = require('path');

class TriviaService {
  constructor() {
    this.historyFile = path.join(process.cwd(), 'data', 'trivia-history.json');
  }

  async loadHistory() {
    try {
      const data = await fs.readFile(this.historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist, return empty history
      return {
        usedFacts: {},
        lastFetch: null
      };
    }
  }

  async saveHistory(history) {
    await fs.mkdir(path.dirname(this.historyFile), { recursive: true });
    await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
  }

  async loadTriviaData() {
    try {
      const triviaFile = path.join(process.cwd(), 'data', 'daily-trivia.json');
      const data = await fs.readFile(triviaFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return { trivia: [] };
    }
  }


  async fetchWordOfTheDay() {
    // Try Wordnik API if configured
    if (process.env.WORDNIK_API_KEY) {
      try {
        const response = await fetch(`https://api.wordnik.com/v4/words.json/wordOfTheDay?api_key=${process.env.WORDNIK_API_KEY}`);
        const data = await response.json();
        if (data && data.word) {
          const definition = data.definitions?.[0]?.text || 'No definition available';
          const note = data.note || '';
          return `Word of the day: "${data.word}" - ${definition}${note ? ` (${note})` : ''}`;
        }
      } catch (error) {
        console.log('Wordnik API failed:', error.message);
      }
    }

    // Try to get a random word and its etymology from Free Dictionary API
    try {
      // List of interesting business/tech words to look up
      const words = ['algorithm', 'deadline', 'mentor', 'protocol', 'freelance', 'entrepreneur', 'sabotage', 'robot'];
      const word = words[Math.floor(Math.random() * words.length)];
      
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
      const data = await response.json();
      
      if (data && data[0]) {
        const origin = data[0].origin;
        const definition = data[0].meanings?.[0]?.definitions?.[0]?.definition;
        if (origin) {
          return `Etymology: "${word}" - ${origin}`;
        } else if (definition) {
          return `Word spotlight: "${word}" - ${definition}`;
        }
      }
    } catch (error) {
      console.log('Dictionary API failed:', error.message);
    }

    return null;
  }

  async fetchFromAPI() {
    // Try multiple APIs in order of preference
    
    // 1. Try word of the day / etymology
    const wordTrivia = await this.fetchWordOfTheDay();
    if (wordTrivia) return wordTrivia;

    // 2. Try Today in History
    try {
      const today = new Date();
      const response = await fetch(`http://history.muffinlabs.com/date/${today.getMonth() + 1}/${today.getDate()}`);
      const data = await response.json();
      if (data && data.data && data.data.Events && data.data.Events.length > 0) {
        const events = data.data.Events;
        // Pick a random event from today's history
        const event = events[Math.floor(Math.random() * Math.min(events.length, 5))]; // Random from first 5 events
        return `On this day in ${event.year}: ${event.text}`;
      }
    } catch (error) {
      console.log('History API failed:', error.message);
    }

    // 3. Try Numbers API for date facts
    try {
      const today = new Date();
      const response = await fetch(`http://numbersapi.com/${today.getMonth() + 1}/${today.getDate()}/date`);
      const fact = await response.text();
      if (fact && !fact.includes('ERR')) {
        return `On this day: ${fact}`;
      }
    } catch (error) {
      console.log('Numbers API failed:', error.message);
    }

    // 4. Try API Ninjas Facts (requires API key)
    if (process.env.API_NINJAS_KEY) {
      try {
        const response = await fetch('https://api.api-ninjas.com/v1/facts?limit=1', {
          headers: { 'X-Api-Key': process.env.API_NINJAS_KEY }
        });
        const data = await response.json();
        if (data && data[0]) {
          return `Did you know? ${data[0].fact}`;
        }
      } catch (error) {
        console.log('API Ninjas failed:', error.message);
      }
    }

    return null;
  }

  async getDailyTrivia() {
    const history = await this.loadHistory();
    const today = new Date().toISOString().split('T')[0];
    
    // Check if we already have trivia for today
    if (history.usedFacts[today]) {
      return history.usedFacts[today];
    }

    // Try to fetch from API
    let trivia = await this.fetchFromAPI();
    
    if (!trivia) {
      return null; // No trivia available today
    }

    // Save to history
    history.usedFacts[today] = trivia;
    history.lastFetch = new Date().toISOString();

    await this.saveHistory(history);
    return trivia;
  }
}

module.exports = TriviaService;