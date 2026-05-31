# Pokémon Auto Battler - Documento de Design e Especificação Técnica

## Visão Geral

Pokémon Auto Battler é um jogo inspirado na estrutura econômica e de progressão de Super Auto Pets, porém utilizando batalhas Pokémon reais simuladas automaticamente.

O objetivo não é balanceamento competitivo perfeito.

O objetivo é criar um sistema emergente, altamente aleatório, onde Pokémon, IVs, EVs, naturezas, golpes e itens geram situações únicas a cada partida.

As batalhas devem utilizar as mecânicas oficiais de Pokémon da geração selecionada.

O jogador não controla os combates. Toda a estratégia ocorre durante a montagem do time.

---

# Filosofia Principal

Manter o máximo possível das mecânicas originais de Pokémon.

Evitar simplificações de combate.

Aceitar desbalanceamentos naturais entre espécies.

Valorizar sorte, adaptação e tomada de decisão na loja.

---

# Estrutura da Partida

## Início

O jogador inicia com:

* Ouro inicial
* Vida inicial
* Loja inicial
* Time vazio

---

## Rodadas

Cada rodada possui:

1. Fase de compra
2. Fase de organização do time
3. Fase de batalha automática
4. Resultado
5. Próxima rodada

---

# Sistema de Loja

## Pokémon

A loja exibe apenas formas básicas.

Exemplos:

* Bulbasaur
* Charmander
* Squirtle
* Magikarp
* Dratini

Nunca:

* Ivysaur
* Charizard
* Dragonite

---

## Sorteio dos Pokémon

Os Pokémon disponíveis dependem:

* Da geração selecionada
* Do tier liberado na rodada atual

---

## Tiers

Os tiers representam raridade.

Exemplo:

Tier 1:

* Caterpie
* Pidgey
* Magikarp

Tier 2:

* Pikachu
* Growlithe

Tier 3:

* Abra
* Gastly

Tier 4:

* Dratini

Tier 5:

* Larvitar

Tier 6:

* Beldum

Os tiers não precisam representar força competitiva.

Representam raridade de obtenção.

---

# Gerações

Cada geração funciona como um conjunto independente.

Exemplos:

Gen 1
Gen 2
Gen 3
Gen 4
Gen 5
Gen 6
Gen 7
Gen 8
Gen 9

A geração selecionada define:

* Pokémon disponíveis
* Tipos disponíveis
* Mecânicas de batalha
* Habilidades
* Itens
* Movimentos

Todas as regras da geração devem ser respeitadas.

---

# Dados de Pokémon

Cada Pokémon comprado gera uma instância única.

## Gerado ao Comprar

* Espécie
* Natureza
* IVs
* EVs
* Sexo
* Shiny (opcional)
* Habilidade
* Golpes

---

# IVs

Gerados aleatoriamente.

Mantidos durante toda a existência do Pokémon.

Não mudam ao evoluir.

---

# EVs

Gerados aleatoriamente.

Mantidos durante toda a existência do Pokémon.

Não mudam ao evoluir.

---

# Natureza

Gerada aleatoriamente.

Mantida permanentemente.

---

# Evolução

## Regra Geral

A evolução ocorre através de fusão.

Exemplo:

Bulbasaur + Bulbasaur → Ivysaur

Ivysaur + Bulbasaur → Venusaur

---

## Herança de Dados

Quando ocorre fusão:

Os dados do Pokémon clicado por último tornam-se a base.

São preservados:

* IVs
* EVs
* Natureza
* Sexo
* Shiny
* Habilidade

A espécie é substituída pela evolução.

---

## Evoluções Especiais

Algumas linhas exigem mais cópias.

Exemplos:

Charmander:
2 cópias para evoluir

Bulbasaur:
2 cópias para evoluir

Magikarp:
5 cópias para evoluir

Feebas:
6 cópias para evoluir

Larvitar:
4 cópias para evoluir

O custo de evolução funciona como ferramenta principal de balanceamento.

---

# Nível

Todos os Pokémon da partida possuem o mesmo nível.

Exemplo:

Nível 30

Bulbasaur Lv30

Ivysaur Lv30

Venusaur Lv30

O nível nunca muda.

Apenas a espécie muda.

---

# Movimentos

## Geração dos Golpes

Ao criar um Pokémon:

1. Obter todos os golpes possíveis naquele nível.
2. Remover golpes banidos.
3. Sortear 4 golpes únicos.
4. Garantir pelo menos um golpe ofensivo.

---

## Regras

Não permitir golpes repetidos.

Não permitir 4 golpes exclusivamente utilitários.

---

## Golpes Banidos

Exemplos:

* Teleport
* Roar
* Whirlwind
* Splash
* Celebrate
* Hold Hands

Qualquer golpe incompatível com o formato.

---

## Ao Evoluir

Os golpes são regenerados.

Novo sorteio.

Baseado na espécie evoluída.

Mantendo as mesmas regras.

---

# PP

Não existe sistema de PP.

Todos os golpes possuem uso infinito.

---

# Itens

Itens podem ser comprados na loja.

Cada Pokémon pode equipar um item.

Itens são separados por tiers.

Os tiers representam raridade.

A lista exata depende da geração.

Itens relacionados a PP são removidos.

---

# Formação

O time possui até 6 Pokémon.

Existe ordem fixa.

Posição 1 é o líder.

---

# Sistema de Batalha

## Filosofia

Utilizar batalhas Pokémon reais.

Nenhum jogador controla ações.

Todo o combate é automático.

---

## Estrutura

Apenas o primeiro Pokémon de cada fila está ativo.

Exemplo:

Time A

1. Gyarados
2. Venusaur
3. Pikachu

Time B

1. Charizard
2. Snorlax
3. Machamp

---

## Fluxo

Gyarados luta contra Charizard.

Quando Charizard desmaia:

Snorlax entra.

Gyarados permanece:

* Com o mesmo HP
* Mesmo status
* Mesmo item
* Mesmos boosts

---

## Persistência

Devem permanecer:

* Clima
* Terrain
* Hazards
* Boosts
* Debuffs
* Status

Tudo segue as regras oficiais.

---

# Trocas

Não existem trocas voluntárias.

O jogador não controla o combate.

---

# Golpes de Troca

Remover ou desabilitar:

* U-Turn
* Volt Switch
* Baton Pass
* Teleport

---

# IA de Combate

Combate totalmente automático.

A IA deve:

1. Avaliar golpes disponíveis.
2. Calcular dano esperado.
3. Considerar chance de KO.
4. Escolher ação de maior valor esperado.

Nenhuma previsão avançada é necessária.

---

# Motor de Batalha

Recomendação obrigatória:

Pokémon Showdown Battle Engine.

O sistema deve reutilizar o simulador oficial open-source sempre que possível.

Objetivo:

Garantir fidelidade máxima às mecânicas.

---

# Multiplayer Online

## Arquitetura

Servidor autoritativo.

Toda batalha ocorre no servidor.

---

## Matchmaking

Jogadores são pareados por rodada.

Sem interação direta durante combate.

---

## Sincronização

Enviar para clientes:

* Eventos de batalha
* Estado dos Pokémon
* Resultados

Nunca cálculos internos.

---



# MVP Inicial

Primeira versão:

* Apenas Gen 1
* Sem matchmaking ranqueado
* Sem cosméticos
* Sem animações avançadas
* Apenas batalhas automáticas
* Apenas loja e evolução

Objetivo:

Validar se a combinação Pokémon + Auto Battler funciona e é divertida.



# Tecnologias Recomendadas

## Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* Zustand (gerenciamento de estado)

Motivos:

* Funciona diretamente no navegador.
* Gratuito.
* Fácil hospedagem.
* Menor consumo de recursos que Unity WebGL.
* Melhor integração com sistemas online.

---

## Backend

* Node.js
* TypeScript
* Express ou Fastify

---

## Banco de Dados

* PostgreSQL

Alternativas gratuitas:

* Supabase
* Neon

---

## Cache e Sessões

* Redis

Alternativas gratuitas:

* Upstash Redis

---

## Simulação de Batalha

* Pokémon Showdown Battle Engine

O motor deve rodar exclusivamente no servidor.

O cliente apenas recebe os eventos da batalha.

---

## Comunicação em Tempo Real

* WebSockets
* Socket.io

Permite:

* Matchmaking
* Atualização da loja
* Batalhas em tempo real
* Espectadores

---

## Hospedagem Gratuita Inicial

Frontend:

* GitHub Pages
* Cloudflare Pages
* Vercel

Backend:

* Render
* Railway
* Fly.io

Banco:

* Supabase
* Neon

Redis:

* Upstash

---

## Estrutura de Projeto

Frontend

* Interface
* Loja
* Inventário
* Formação
* Replay de batalhas
* Login

Backend

* Matchmaking
* Simulação Pokémon
* Economia
* Evoluções
* Inventário
* Persistência

Banco

* Usuários
* Partidas
* Pokémon
* Rankings
* Histórico

---

## Arquitetura

Frontend (React)

↓ WebSocket

Backend (Node.js)

↓
Pokémon Showdown Engine

↓
PostgreSQL

Toda lógica do jogo deve existir no backend.

O frontend apenas envia ações do jogador e exibe resultados.

---

## Escalabilidade

O sistema deve ser desenvolvido desde o início utilizando arquitetura data-driven.

Nenhum Pokémon deve ser codificado manualmente.

Todos os dados devem ser carregados de tabelas e arquivos de configuração:

* Pokémon
* Golpes
* Habilidades
* Itens
* Evoluções
* Tiers
* Gerações

Isso permitirá adicionar novas gerações sem alterar código.

---

## Meta Inicial

Objetivo do MVP:

* Jogável pelo navegador
* Multiplayer online
* Gen 1 apenas
* Sistema de loja
* Evoluções
* Batalhas automáticas
* Matchmaking básico
* Replays simples

Objetivo futuro:

* Todas as gerações
* Rankings
* Torneios
* Espectadores
* Histórico de partidas
* Modos alternativos
