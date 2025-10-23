import firebase from 'firebase/compat/app';

export type Timestamp = firebase.firestore.Timestamp;

export enum EventStatus {
  Orcamento = 'ORÇAMENTO',
  Aprovado = 'APROVADO',
  EmAndamento = 'EM ANDAMENTO',
  Concluido = 'CONCLUÍDO',
}

export interface Briefing {
  eventName: string;
  client: string;
  osVersion: string;
  location: string;
  atendimentoF2: string;
  produtorF2: string;
  direcaoTecnica: string;
  direcaoArtistica: string;
  produtorMaster: string;
  reuniaoBriefing: string;
  dataVT: string;
  dataEntregaTeste: string;
  descargaLocal: string;
  montagem: string;
  ensaio: string;
  dataInicio: string;
  dataFim: string;
  dataMontagem: string;
  dataDesmontagem: string;
  historicoComercial: string;
  expectativaCliente: string;
  pontosAtencao: string;
  descricaoAtivacao: string;
  publico: number;
  equipamentosNossos: string;
  plataformaAtivacao: string;
  preMontagem: string;
  brindes: string;
  relatorios: string;
  recebimentoConteudos: string;
  logisticaEquipe: string;
  terceirosCenografia: string;
  terceirosTecnica: string;
  equipamentosTerceiros: string;
  painelLED: string;
  localSalaPavilhao: string;
  acessoCargaDescarga: string;
  horarioCargaDescarga: string;
  armazenagemCases: string;
  ginnie: string;
  alimentacaoAC: string;
  houseMIX: string;
  documentacaoInfra: string;
  documentacaoEquipe: string;
  carregadores: string;
  assignedPersonnel: { [key: string]: string };
  equipeF2: string[];
}

export interface Debriefing {
  objetivoPrincipal: string;
  resultadoGeral: 'Sucesso Total' | 'Sucesso com Ressalvas' | 'Neutro' | 'Abaixo do Esperado';
  justificativaResultado: string;
  principaisDestaques: string;
  principaisDesafios: string;
  recomendacaoChave: string;
  entregaVsPlanejado: string;
  performanceTecnica: string;
  receptividadePublico: string;
  feedbackClienteProduto: string;
  comunicacaoAlinhamento: string;
  elogiosCriticasServico: string;
  pontosTensaoSolucoes: string;
  consolidadoMontagem: string;
  consolidadoEnsaio: string;
  consolidadoEvento: string;
  consolidadoDesmontagem: string;
  comercialManter: string;
  comercialParar: string;
  comercialComecar: string;
  producaoManter: string;
  producaoParar: string;
  producaoComecar: string;
  devManter: string;
  devParar: string;
  devComecar: string;
  preenchidoPor: string;
  dataPreenchimento: string;
}


export interface EventData {
  id: string;
  briefing: Partial<Briefing>;
  debriefing?: Partial<Debriefing>;
  status: EventStatus;
  createdAt: Timestamp;
  creatorUid: string;
  creatorEmail: string;
  budgetItems?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  name: string;
  quantity: number;
  days: number;
  dailyRate: number;
  total: number;
}

export enum CollaboratorCategory {
    Gestor = 'Gestor',
    Tecnico = 'Técnico',
    Coordenador = 'Coordenador',
    Programador = 'Programador',
    Freelancer = 'Freelancer',
    Motorista = 'Motorista',
}

export interface Collaborator {
    id: string;
    nome: string;
    apelido?: string;
    cargo?: string;
    cpf?: string;
    rg?: string;
    nascimento?: string;
    cnpj?: string;
    email?: string;
    telefone?: string;
    banco?: string;
    codBanco?: string;
    agencia?: string;
    conta?: string;
    chavePix?: string;
    categoria: CollaboratorCategory;
    tipo?: string;
    cacheTecnico?: number;
    cacheProgramador?: number;
}

export interface Equipment {
    id: string;
    nome: string;
    descricao?: string;
    dimensoes?: string;
    peso?: string;
    voltagem?: string;
    valorUnitario?: number;
    fotoUrl?: string;
}
