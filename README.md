# Super Auto Mon  (Pokémon Auto Battler)

Bem-vindo ao **Super Auto Mon**, um auto battler estratégico no estilo *Super Auto Pets* que utiliza as mecânicas, fórmulas e o motor de simulação oficial do **Pokémon Showdown** para travar combates 100% fiéis às regras oficiais de Pokémon.

---

## 🎮 Como Jogar (Regras do Jogo)

1. **Montagem do Time**: Você começa com **10 de Ouro**, **5 Vidas (Corações)** e um time vazio.
2. **Fase de Compra**:
   - Compre Pokémon básicos (Tier 1 a 6) por **3 de Ouro** cada.
   - Compre itens equipáveis (como Leftovers, Berries, etc.) por **3 de Ouro**.
   - Congele (Freeze) itens/Pokémon na loja para mantê-los na próxima rodada.
   - Faça **Reroll** da loja por **1 de Ouro** para buscar novos Pokémon e itens.
3. **Evolução por Fusão**:
   - Combine dois Pokémon da mesma espécie arrastando ou clicando neles!
   - Ao se fundirem, o Pokémon preserva os IVs, EVs, Natureza, Sexo e Habilidade do original, mas herda a espécie evoluída caso atinja a quantidade de cópias necessárias.
   - Golpes são sorteados novamente após evoluir baseados nos golpes válidos aprendidos até o nível 30.
   - A quantidade de cópias exigidas varia (Starters exigem 2 cópias, Magikarp exige 5, Dratini exige 3, etc.).
4. **Combates Automáticos**:
   - Quando estiver pronto, clique em **Ir para Batalha**.
   - O servidor emparelhará você contra o time de outro jogador real que jogou na mesma rodada (ou um time de IA robusto como fallback).
   - A batalha corre 100% de forma automática em tempo real em nosso servidor usando o motor do **Pokémon Showdown**.
   - Se vencer, você ganha **Troféus**! Se perder, perde **Vidas**. O jogo acaba se você perder todas as vidas ou atingir o limite máximo de troféus!

---

## 🏗️ Arquitetura Técnica

- **Frontend**: React + TypeScript + Vite + Zustand + Tailwind CSS.
- **Backend**: Node.js + Fastify + Socket.io + `@pkmn/sim` (Motor oficial de batalhas do Pokémon Showdown portado para JS/TS).
- **Matchmaker**: Sistema assíncrono que grava as equipes dos jogadores por rodada e as sorteia para partidas posteriores.
- **Sprites**: Sprites 100% animados retirados em tempo real do repositório oficial do Pokémon Showdown!

---

## 🚀 Como Executar o Projeto

Você precisará do **Node.js** instalado em seu computador.

### Passo 1: Iniciar o Servidor (Backend)
1. Abra um terminal na pasta `backend/`:
   ```bash
   cd backend
   ```
2. Instale as dependências (se ainda não o fez):
   ```bash
   npm install
   ```
3. Inicie o servidor em modo de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O servidor HTTP e WebSocket rodará na porta `3001`.*

### Passo 2: Iniciar a Interface (Frontend)
1. Abra um segundo terminal na pasta `frontend/`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor Vite:
   ```bash
   npm run dev
   ```
4. Abra o link gerado no seu navegador (geralmente `http://localhost:3000` ou `http://localhost:5173`).

---

## 🛠️ Detalhes da Integração com o Pokémon Showdown
- Golpes banidos (como *Teleport*, *Self-Destruct*, *Baton Pass*) foram removidos dos pools de sorteio para manter o equilíbrio do auto battler.
- A IA de combate calcula a eficácia do tipo de movimento físico/especial e o bônus de STAB para decidir dinamicamente o golpe com maior valor esperado de dano/nocaute por turno.
