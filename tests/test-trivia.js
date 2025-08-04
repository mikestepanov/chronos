#!/usr/bin/env node

const TriviaService = require('../src/services/triviaService');

async function testTrivia() {
  const triviaService = new TriviaService();
  
  console.log('Testing Trivia Service...\n');
  
  // Get today's trivia
  const trivia = await triviaService.getDailyTrivia();
  console.log("Today's trivia:");
  console.log(`💡 ${trivia}`);
  
  // Show what API is being used
  const todayMMDD = new Date().toISOString().slice(5, 10);
  console.log(`\nToday's date (MM-DD): ${todayMMDD}`);
  
  // Check if we have date-specific trivia
  const triviaData = await triviaService.loadTriviaData();
  const dateTrivia = triviaData.trivia.find(t => t.date === todayMMDD);
  if (dateTrivia) {
    console.log('Using date-specific trivia from JSON!');
  } else {
    console.log('Using API or fallback trivia');
  }
  
  // Show history
  const history = await triviaService.loadHistory();
  console.log('\nTrivia history:');
  console.log(JSON.stringify(history, null, 2));
}

testTrivia().catch(console.error);