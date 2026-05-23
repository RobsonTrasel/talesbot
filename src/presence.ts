import { ActivityType, PresenceStatusData } from "discord.js";
import type { PresenceEntry } from "./core/PresenceRotator";

/**
 * Cada entrada vira o status do bot por um tempo.
 * Edite, adicione, remova. O bot pega na proxima vez que iniciar.
 *
 * Tipos de atividade:
 *   - ActivityType.Custom      => so o texto, sem prefixo (estilo bio)
 *   - ActivityType.Listening   => "Ouvindo <texto>"
 *   - ActivityType.Watching    => "Assistindo a <texto>"
 *   - ActivityType.Playing     => "Jogando <texto>"
 *   - ActivityType.Competing   => "Competindo em <texto>"
 *
 * Variaveis disponiveis no texto:
 *   {servers}  numero de servidores
 *   {users}    total de membros
 *   {ping}     latencia WebSocket em ms
 */
export const presences: PresenceEntry[] = [
  { type: ActivityType.Custom, name: "Carinhoso, Emocionado, Meigo E Safadinho" },
  { type: ActivityType.Custom, name: "Carente Igual Cachorro Que Nunca Foi Pro Pet Shop" },
  { type: ActivityType.Custom, name: "Sofrendo Por Pessoa Que Inventei Na Minha Cabeça" },
  { type: ActivityType.Custom, name: "Sou Único, Por Isso Tô Solteiro" },
  { type: ActivityType.Custom, name: "Gênero: Hétero · Solteiro Por Opção (Dos Outros)" },
  { type: ActivityType.Custom, name: "Tipo De Pessoa Que Chora Em Comercial De Banco" },
  { type: ActivityType.Custom, name: "Bonito Não, Mas Chato Sou" },
  { type: ActivityType.Custom, name: "Coração De Menino Apaixonado Por Quem Não Tá Nem Aí" },
  { type: ActivityType.Custom, name: "Não Tô Mal, Só Tô Vivendo Personagem Triste Hoje" },
  { type: ActivityType.Custom, name: "Mãe Pergunta Quando Eu Caso, Eu Mudo De Assunto" },
  { type: ActivityType.Custom, name: "Procuro Alguém Pra Mandar Bom Dia E Dividir Boleto" },
  { type: ActivityType.Custom, name: "Sertanejo No Fone, Boleto Na Mesa" },
  { type: ActivityType.Custom, name: "Tô Bem, Só Não Tô Feliz" },
  { type: ActivityType.Custom, name: "Vacila Comigo Pra Ver O Drama Que Eu Faço" },
  { type: ActivityType.Custom, name: "Disponível Pra Quem Tem Paciência E Wi-Fi" },
  { type: ActivityType.Custom, name: "Pisa No Meu Coração Que Eu Faço Música Sobre Isso" },
  { type: ActivityType.Custom, name: "Hobbie Favorito: Olhar O Teto E Pensar Na Vida" },
  { type: ActivityType.Custom, name: "Mando 'Tô Pensando Em Você' Pra Mim Mesmo" },
  { type: ActivityType.Custom, name: "Acordei Com Vontade De Ser Amado, Falhei De Novo" },
  { type: ActivityType.Custom, name: "Saudades De Quem Eu Era Antes De Saber Como É A Vida" },
];

/** Intervalo entre trocas, em milissegundos. */
export const presenceIntervalMs = 30_000;

/** Status do bot: 'online' | 'idle' | 'dnd' | 'invisible'. */
export const presenceStatus: PresenceStatusData = "online";
