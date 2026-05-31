import { generatePokemon } from './utils/pokemon-generator';
import { runBattle } from './battle/battle-manager';

async function run() {
  console.log('Generating Pokémon...');
  const bulba = await generatePokemon('bulbasaur', 30);
  const charm = await generatePokemon('charmander', 30);
  const squirtle = await generatePokemon('squirtle', 30);

  const team1 = [bulba, squirtle, null, null, null, null];
  const team2 = [charm, null, null, null, null, null];

  console.log('Starting battle simulation...');
  const result = runBattle(team1, team2, 'Player A', 'Player B');
  console.log('Winner:', result.winner);
  console.log('Logs count:', result.log.length);
  console.log('Battle Logs sample:');
  console.log(result.log.slice(0, 15).join('\n'));
}
run();



