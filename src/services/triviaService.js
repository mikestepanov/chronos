class TriviaService {
  constructor() {
    // No caching - always fetch fresh trivia
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

    // Don't use hardcoded words - not useful for daily variety
    return null;
  }

  async fetchFromAPI() {
    const today = new Date();

    // Fetch from all APIs in parallel
    const apiPromises = [
      // History API - historical events
      fetch(`https://history.muffinlabs.com/date/${today.getMonth() + 1}/${today.getDate()}`)
        .then(res => res.json())
        .then(data => {
          if (data?.data?.Events?.length > 0) {
            const events = data.data.Events;
            const randomIndex = Math.floor(Math.random() * Math.min(events.length, 10));
            const event = events[randomIndex];
            return `📜 On this day in ${event.year}: ${event.text}`;
          }
          return null;
        })
        .catch(err => {
          console.log('History API failed:', err.message);
          return null;
        }),

      // Useless Facts API - random fun facts
      fetch('https://uselessfacts.jsph.pl/api/v2/facts/random?language=en')
        .then(res => res.json())
        .then(data => data?.text ? `🎲 Random fact: ${data.text}` : null)
        .catch(err => {
          console.log('Useless facts API failed:', err.message);
          return null;
        }),

      // API Ninjas - additional facts
      fetch('https://api.api-ninjas.com/v1/facts', {
        headers: { 'X-Api-Key': process.env.NINJAS_KEY || '' }
      })
        .then(res => res.json())
        .then(data => data?.[0]?.fact ? `💭 Did you know? ${data[0].fact}` : null)
        .catch(err => {
          console.log('API Ninjas failed:', err.message);
          return null;
        }),

      // Word of the Day (if API key exists)
      this.fetchWordOfTheDay()
    ];

    // Wait for all APIs to respond (or fail)
    const results = await Promise.allSettled(apiPromises);

    // Collect successful results
    const successfulFacts = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    if (successfulFacts.length === 0) {
      console.log('All trivia APIs failed');
      return null;
    }

    // Log success rate
    console.log(`Trivia APIs: ${successfulFacts.length}/${apiPromises.length} succeeded`);

    // Clean up any backticks that should be apostrophes
    const cleanedFacts = successfulFacts.map(fact =>
      fact.replace(/`/g, "'")
    );

    // Compile all successful facts into a single message
    return cleanedFacts.join('\n\n');
  }

  async getDailyTrivia() {
    // Always fetch fresh trivia - no caching
    return await this.fetchFromAPI();
  }
}

module.exports = TriviaService;