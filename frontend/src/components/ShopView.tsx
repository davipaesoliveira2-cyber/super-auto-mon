import React, { useState } from 'react';
import { useGameStore, ShopItem } from '../store/useGameStore';
import pokemonData from '../data/pokemon-data.json';
import { Heart, Trophy, Coins, RotateCw, Snowflake, Shield, Swords, Trash2, ShieldAlert } from 'lucide-react';

export const ShopView: React.FC = () => {
  const {
    gameState,
    reroll,
    toggleFreeze,
    buyPokemon,
    buyItem,
    sellPokemon,
    movePokemon,
    endTurn,
    resetGame,
    errorMessage
  } = useGameStore();

  const [selectedShopItem, setSelectedShopItem] = useState<ShopItem | null>(null);
  const [selectedTeamSlot, setSelectedTeamSlot] = useState<number | null>(null);

  if (!gameState) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-pokemon-yellow border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400 font-medium">Carregando dados da liga Pokémon...</p>
        </div>
      </div>
    );
  }

  const handleShopItemClick = (item: ShopItem) => {
    setSelectedTeamSlot(null);
    if (selectedShopItem?.id === item.id) {
      setSelectedShopItem(null);
    } else {
      setSelectedShopItem(item);
    }
  };

  const handleTeamSlotClick = (index: number) => {
    // Se há um item de loja selecionado, tenta comprar
    if (selectedShopItem) {
      if (selectedShopItem.type === 'pokemon') {
        buyPokemon(selectedShopItem.id, index);
      } else if (selectedShopItem.type === 'item') {
        buyItem(selectedShopItem.id, index);
      }
      setSelectedShopItem(null);
      return;
    }

    // Se já tinha um slot selecionado, realiza movimento/troca/fusão
    if (selectedTeamSlot !== null) {
      if (selectedTeamSlot !== index) {
        movePokemon(selectedTeamSlot, index);
      }
      setSelectedTeamSlot(null);
    } else {
      // Caso contrário, seleciona o slot atual
      if (gameState.team[index]) {
        setSelectedTeamSlot(index);
      }
    }
  };

  const handleSellClick = () => {
    if (selectedTeamSlot !== null) {
      sellPokemon(selectedTeamSlot);
      setSelectedTeamSlot(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-6">
      {/* Top Header */}
      <header className="flex flex-wrap justify-between items-center bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-4 mb-6 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <img
              src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png"
              alt="Pokeball"
              className="w-12 h-12 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide text-white uppercase">{gameState.playerName}</h1>
            <p className="text-xs text-pokemon-yellow font-bold uppercase tracking-widest">Rodada {gameState.round}</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-full">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            <span className="font-extrabold text-rose-400">{gameState.hearts} / 5</span>
          </div>

          <div className="flex items-center space-x-2 bg-pokemon-blue/10 border border-pokemon-blue/30 px-3 py-1.5 rounded-full">
            <Trophy className="w-5 h-5 text-pokemon-blue fill-pokemon-blue" />
            <span className="font-extrabold text-pokemon-blue">{gameState.trophies}</span>
          </div>

          <div className="flex items-center space-x-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-1.5 rounded-full shadow-inner">
            <Coins className="w-5 h-5 text-pokemon-yellow fill-pokemon-yellow" />
            <span className="font-extrabold text-pokemon-yellow">{gameState.gold} Ouro</span>
          </div>
        </div>
      </header>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-4 flex items-center space-x-2 bg-red-500/10 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl animate-bounce">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          <span className="font-medium text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Arena / Team Section */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Sua Formação (Máx 6)</h2>
          {selectedTeamSlot !== null && (
            <button
              onClick={handleSellClick}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl shadow-lg hover:shadow-red-500/20 transition-all duration-300 transform active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Vender por {1 + (gameState.team[selectedTeamSlot]?.copies || 1) - 1} Ouro</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {gameState.team.map((pokemon, idx) => {
            const isSelected = selectedTeamSlot === idx;
            const canMerge = selectedShopItem?.type === 'pokemon' && pokemon?.species === selectedShopItem.pokemonInstance?.species;
            
            return (
              <div
                key={idx}
                onClick={() => handleTeamSlotClick(idx)}
                className={`relative flex flex-col justify-between items-center rounded-2xl p-4 min-h-[220px] transition-all duration-300 cursor-pointer border shadow-lg ${
                  pokemon
                    ? isSelected
                      ? 'bg-pokemon-blue/20 border-pokemon-blue scale-105 shadow-pokemon-blue/20'
                      : canMerge
                      ? 'bg-emerald-500/10 border-emerald-500/50 border-dashed animate-pulse'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:scale-102'
                    : selectedShopItem
                    ? 'bg-slate-900/30 border-dashed border-slate-700 hover:bg-slate-900/50 hover:border-pokemon-yellow/50'
                    : 'bg-slate-900/20 border-slate-900/50 border-dashed'
                }`}
              >
                {/* Slot index identifier */}
                <div className="absolute top-2 left-2 text-[10px] font-bold text-slate-600 bg-slate-950/40 px-1.5 py-0.5 rounded">
                  POS {idx + 1}
                </div>

                {pokemon ? (
                  <>
                    {/* Item Equipped */}
                    {pokemon.item && (
                      <div className="absolute top-2 right-2 bg-slate-950/80 p-1 rounded-lg border border-slate-800 shadow flex items-center justify-center" title={`Equipado: ${pokemon.item}`}>
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${pokemon.item}.png`}
                          alt={pokemon.item}
                          className="w-5 h-5"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Animated Sprite */}
                    <div className="flex-1 flex items-center justify-center my-2 min-h-[80px]">
                      <img
                        src={`https://play.pokemonshowdown.com/sprites/ani/${pokemon.species}.gif`}
                        alt={pokemon.name}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          // Fallback to official artwork static sprite
                          (e.target as HTMLImageElement).src = `https://img.pokemondb.net/sprites/black-white/normal/${pokemon.species}.png`;
                        }}
                      />
                    </div>

                    {/* Basic Info */}
                    <div className="text-center w-full">
                      <div className="font-extrabold text-sm text-white capitalize leading-tight">
                        {pokemon.name}
                      </div>
                      <div className="text-[10px] text-pokemon-yellow font-bold uppercase tracking-wider">
                        Nv {pokemon.level}
                      </div>
                      
                      {/* Fusions/Copies Badge */}
                      <div className="mt-1 flex items-center justify-center space-x-1">
                        <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800 text-slate-300">
                          {pokemon.copies} {pokemon.copies === 1 ? 'Cópia' : 'Cópias'}
                        </span>
                      </div>
                    </div>

                    {/* Stats summary */}
                    <div className="w-full mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-1 text-[9px] text-slate-400 font-semibold">
                      <div className="flex items-center space-x-1">
                        <Swords className="w-2.5 h-2.5 text-pokemon-red" />
                        <span>ATK: {pokemon.ivs.atk}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Shield className="w-2.5 h-2.5 text-pokemon-blue" />
                        <span>DEF: {pokemon.ivs.def}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      {selectedShopItem ? 'Comprar Aqui' : 'Vazio'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Shop Section */}
      <section className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Mercado Pokémon</h2>
          <button
            onClick={reroll}
            disabled={gameState.gold < 1}
            className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-black py-2.5 px-6 rounded-xl shadow-lg hover:shadow-amber-500/20 transition-all duration-300 transform active:scale-95"
          >
            <RotateCw className="w-4 h-4" />
            <span>Reroll (1 Ouro)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {gameState.shop.map((item) => {
            const isSelected = selectedShopItem?.id === item.id;
            const isPokemon = item.type === 'pokemon';

            return (
              <div
                key={item.id}
                onClick={() => handleShopItemClick(item)}
                className={`relative flex flex-col justify-between items-center rounded-2xl p-4 min-h-[240px] cursor-pointer transition-all duration-300 border shadow-lg ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500 scale-105 shadow-amber-500/20'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:scale-102'
                }`}
              >
                {/* Cost Tag */}
                <div className="absolute top-2 left-2 bg-yellow-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow">
                  <Coins className="w-3 h-3" />
                  <span>{item.cost}</span>
                </div>

                {/* Freeze Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFreeze(item.id);
                  }}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg border transition-all duration-300 ${
                    item.frozen
                      ? 'bg-sky-500/20 border-sky-400 text-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.4)]'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:text-sky-400 hover:border-sky-500/50'
                  }`}
                >
                  <Snowflake className="w-4 h-4 fill-current" />
                </button>

                {isPokemon && item.pokemonInstance ? (
                  <>
                    {/* Animated Sprite */}
                    <div className="flex-1 flex items-center justify-center my-4 min-h-[80px]">
                      <img
                        src={`https://play.pokemonshowdown.com/sprites/ani/${item.pokemonInstance.species}.gif`}
                        alt={item.pokemonInstance.name}
                        className="w-16 h-16 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://img.pokemondb.net/sprites/black-white/normal/${item.pokemonInstance?.species}.png`;
                        }}
                      />
                    </div>

                    <div className="text-center w-full">
                      <div className="font-extrabold text-sm text-white capitalize leading-tight">
                        {item.pokemonInstance.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Tier {pokemonData[item.pokemonInstance.species as keyof typeof pokemonData]?.tier}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Item representation */}
                    <div className="flex-1 flex items-center justify-center my-4 min-h-[80px]">
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${item.itemName}.png`}
                        alt={item.itemName}
                        className="w-12 h-12 object-contain drop-shadow-md"
                      />
                    </div>

                    <div className="text-center w-full">
                      <div className="font-extrabold text-sm text-white capitalize leading-tight">
                        {item.itemName?.replace('berry', ' Berry')}
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                        Item Equipável
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Control Buttons */}
      <footer className="mt-8 flex justify-between items-center pt-6 border-t border-slate-800/80">
        <button
          onClick={resetGame}
          className="text-slate-400 hover:text-white font-semibold text-sm transition-colors duration-300"
        >
          Reiniciar Jogo
        </button>

        <button
          onClick={endTurn}
          className="bg-pokemon-red hover:bg-red-500 text-white font-black uppercase tracking-wider py-4 px-10 rounded-2xl shadow-xl hover:shadow-red-500/20 transition-all duration-300 transform active:scale-95 flex items-center space-x-2"
        >
          <span>Ir para Batalha</span>
        </button>
      </footer>
    </div>
  );
};
