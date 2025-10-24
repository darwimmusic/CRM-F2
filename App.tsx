import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { auth, db } from './services/firebase';
// Fix: Import firebase compat to use v8 syntax
import firebase from 'firebase/compat/app';
import { EventData, EventStatus, Briefing, Collaborator, Equipment, CollaboratorCategory, Debriefing, Timestamp, BudgetItem } from './types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';

// Icons
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 013 1.803M15 21a9 9 0 00-9-5.197M15 11a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7l8 4" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;

// --- Briefing Configuration ---
interface BriefingField {
    name: string;
    label: string;
    required?: boolean;
    type?: string;
    as?: 'input' | 'textarea' | 'select';
}

const briefingSections: { [key: string]: { title: string; fields: BriefingField[] } } = {
  identificacaoProjeto: {
    title: 'Identificação do Projeto',
    fields: [
      { name: 'eventName', label: 'Nome do Evento', required: true },
      { name: 'osVersion', label: 'Número da OS' },
      { name: 'dataMontagem', label: 'Data de Montagem', type: 'datetime-local' },
      { name: 'dataDesmontagem', label: 'Data de Desmontagem', type: 'datetime-local' },
      { name: 'dataInicio', label: 'Início do Evento', type: 'datetime-local' },
      { name: 'dataFim', label: 'Fim do Evento', type: 'datetime-local' },
    ]
  },
  direcao: {
    title: 'Direção',
    fields: [
      { name: 'direcaoTecnica', label: 'Direção Técnica' },
      { name: 'direcaoArtistica', label: 'Direção Artística' },
    ]
  },
  dadosGerais: {
    title: 'Dados Gerais',
    fields: [
      { name: 'client', label: 'Cliente' },
      { name: 'location', label: 'Local e Endereço' },
      { name: 'atendimentoF2', label: 'Atendimento F2' },
      { name: 'produtorF2', label: 'Produtor F2' },
    ]
  },
  datas: {
    title: 'Datas e Prazos',
    fields: [
      { name: 'produtorMaster', label: 'Produtor Master Cliente' },
      { name: 'reuniaoBriefing', label: 'Reunião Briefing', type: 'date' },
      { name: 'dataVT', label: 'Data VT', type: 'date' },
      { name: 'dataEntregaTeste', label: 'Data Entrega Teste', type: 'date' },
      { name: 'descargaLocal', label: 'Descarga Local', type: 'datetime-local' },
      { name: 'montagem', label: 'Montagem', type: 'datetime-local' },
      { name: 'ensaio', label: 'Ensaio', type: 'datetime-local' },
    ]
  },
  escopo: {
    title: 'Escopo e Objetivos',
    fields: [
      { name: 'historicoComercial', label: 'Histórico Comercial', as: 'textarea' },
      { name: 'expectativaCliente', label: 'Expectativa Cliente', as: 'textarea' },
      { name: 'pontosAtencao', label: 'Pontos de Atenção', as: 'textarea' },
      { name: 'descricaoAtivacao', label: 'Descrição da Ativação', as: 'textarea' },
      { name: 'publico', label: 'Público (Quantidade)', type: 'number' },
      { name: 'plataformaAtivacao', label: 'Plataforma Ativação' },
    ]
  },
  operacional: {
    title: 'Operacional',
    fields: [
      { name: 'equipeF2', label: 'Equipe F2' },
    ]
  },
  terceiros: {
    title: 'Terceiros',
    fields: [
      { name: 'terceirosCenografia', label: 'Terceiros - Cenografia' },
      { name: 'terceirosTecnica', label: 'Terceiros - Técnica' },
      { name: 'equipamentosTerceiros', label: 'Equipamentos Terceiros', as: 'textarea' },
      { name: 'painelLED', label: 'Painel LED' },
    ]
  },
  local: {
    title: 'Local',
    fields: [
      { name: 'localSalaPavilhao', label: 'Local/Sala/Pavilhão' },
      { name: 'acessoCargaDescarga', label: 'Acesso Carga/Descarga' },
      { name: 'horarioCargaDescarga', label: 'Horário Carga/Descarga' },
      { name: 'armazenagemCases', label: 'Armazenagem Cases' },
      { name: 'ginnie', label: 'Ginnie (Tomada)' },
      { name: 'alimentacaoAC', label: 'Alimentação A/C' },
      { name: 'houseMIX', label: 'House MIX' },
      { name: 'documentacaoInfra', label: 'Documentação Infra (ART/Laudos)' },
      { name: 'documentacaoEquipe', label: 'Documentação Equipe (Seguro/Aso)' },
      { name: 'carregadores', label: 'Carregadores' },
    ]
  },
};

// --- Helper Functions & Components ---

const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // Add check for invalid date
    if (isNaN(date.getTime())) return 'Data inválida';
    return new Intl.DateTimeFormat('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    }).format(date);
};

const formatTimestamp = (ts: Timestamp | undefined) => {
    if (!ts) return 'N/A';
    return formatDate(ts.toDate().toISOString());
};


const formatMonthYear = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric'
    }).format(date).replace(/^\w/, (c) => c.toUpperCase());
};

const getStatusColor = (status: EventStatus) => {
    switch (status) {
        case EventStatus.Aprovado: return 'bg-green-500';
        case EventStatus.EmAndamento: return 'bg-blue-500';
        case EventStatus.Concluido: return 'bg-gray-500';
        case EventStatus.Orcamento: return 'bg-yellow-500';
        default: return 'bg-gray-400';
    }
};

interface FormFieldProps {
    label: string;
    name: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    type?: string;
    required?: boolean;
    as?: 'input' | 'textarea' | 'select';
    options?: { value: string; label: string }[];
}

const FormField: React.FC<FormFieldProps> = ({ label, name, value, onChange, type = 'text', required = false, as = 'input', options }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
        {as === 'textarea' ? (
            <textarea id={name} name={name} value={value} onChange={onChange} rows={3} className="w-full bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" />
        ) : as === 'select' ? (
             <select id={name} name={name} value={value} onChange={onChange} className="w-full bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500">
                {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        ) : (
            <input type={type} id={name} name={name} value={value} onChange={onChange} required={required} className="w-full bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500" />
        )}
    </div>
);

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start z-50 pt-10 pb-10 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl m-4">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-2xl font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Collaborator Selector Component ---
const CollaboratorSelector: React.FC<{
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ selected, onChange }) => {
    const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
    const [filteredCollaborators, setFilteredCollaborators] = useState<Collaborator[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [cargoFilter, setCargoFilter] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchCollaborators = async () => {
            setIsLoading(true);
            try {
                const snapshot = await db.collection("collaborators").orderBy("nome").get();
                const collabs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
                setAllCollaborators(collabs);
            } catch (error) {
                
            }
            setIsLoading(false);
        };
        fetchCollaborators();
    }, []);

    useEffect(() => {
        let filtered = allCollaborators;
        if (cargoFilter) {
            filtered = filtered.filter(c => c.cargo === cargoFilter);
        }
        if (searchTerm) {
            filtered = filtered.filter(c => c.nome.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredCollaborators(filtered);
    }, [searchTerm, cargoFilter, allCollaborators]);

    const cargoOptions = useMemo(() => {
        const cargos = [...new Set(allCollaborators.map(c => c.cargo).filter(Boolean))];
        return ['', ...cargos];
    }, [allCollaborators]);

    const handleSelect = (collaboratorId: string) => {
        const newSelected = selected.includes(collaboratorId)
            ? selected.filter(id => id !== collaboratorId)
            : [...selected, collaboratorId];
        onChange(newSelected);
    };
    
    const getSelectedCollaboratorNames = () => {
        return allCollaborators
            .filter(c => selected.includes(c.id))
            .map(c => c.nome)
            .join(', ');
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipe F2</label>
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-h-[42px]"
            >
                {selected.length > 0 ? getSelectedCollaboratorNames() : <span className="text-gray-500">Selecione os colaboradores...</span>}
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg">
                    <div className="p-2 border-b">
                        <input
                            type="text"
                            placeholder="Pesquisar por nome..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-md p-2 mb-2"
                        />
                        <select
                            value={cargoFilter}
                            onChange={e => setCargoFilter(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-md p-2"
                        >
                            <option value="">Todos os Cargos</option>
                            {cargoOptions.map(cargo => <option key={cargo} value={cargo}>{cargo}</option>)}
                        </select>
                    </div>
                    <ul className="max-h-60 overflow-y-auto p-2">
                        {isLoading ? (
                            <li className="p-2 text-gray-500">Carregando...</li>
                        ) : (
                            filteredCollaborators.map(c => (
                                <li key={c.id} className="p-2 hover:bg-gray-100 rounded-md cursor-pointer flex items-center" onClick={() => handleSelect(c.id)}>
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(c.id)}
                                        readOnly
                                        className="mr-3 h-4 w-4"
                                    />
                                    <div>
                                        <div className="font-medium">{c.nome}</div>
                                        <div className="text-sm text-gray-500">{c.cargo}</div>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- Equipment Selector Component ---
const EquipmentSelector: React.FC<{
    onSelect: (equipment: Equipment) => void;
}> = ({ onSelect }) => {
    const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
    const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchEquipment = async () => {
            setIsLoading(true);
            try {
                const snapshot = await db.collection("equipment").orderBy("nome").get();
                const equipList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment));
                setAllEquipment(equipList);
            } catch (error) {
                console.error("Error fetching equipment:", error);
            }
            setIsLoading(false);
        };
        fetchEquipment();
    }, []);

    useEffect(() => {
        let filtered = allEquipment;
        if (searchTerm) {
            filtered = filtered.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredEquipment(filtered);
    }, [searchTerm, allEquipment]);

    const handleSelect = (equipment: Equipment) => {
        onSelect(equipment);
        setSearchTerm(equipment.nome);
        setIsOpen(false);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Item</label>
            <input
                ref={inputRef}
                type="text"
                placeholder="Pesquisar equipamento..."
                value={searchTerm}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    if (!isOpen) setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                className="w-full bg-white border border-gray-300 rounded-md p-2"
            />
            {isOpen && (
                <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 shadow-lg">
                    <ul className="max-h-60 overflow-y-auto p-2">
                        {isLoading ? (
                            <li className="p-2 text-gray-500">Carregando...</li>
                        ) : (
                            filteredEquipment.map(e => (
                                <li key={e.id} className="p-2 hover:bg-gray-100 rounded-md cursor-pointer" onClick={() => handleSelect(e)}>
                                    <div className="font-medium">{e.nome}</div>
                                    <div className="text-sm text-gray-500">R$ {e.valorUnitario?.toFixed(2)}</div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    // Fix: Use firebase.User type from compat library
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState(window.location.hash || '#/dashboard');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    useEffect(() => {
        const handleHashChange = () => setRoute(window.location.hash);
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        // Fix: Use auth.onAuthStateChanged from v8 compat syntax
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (!currentUser) {
                window.location.hash = '#/login';
            } else if (window.location.hash === '#/login' || window.location.hash === '') {
                 window.location.hash = '#/dashboard';
            }
        });
        return () => unsubscribe();
    }, []);
    
    const handleLogout = async () => {
        // Fix: Use auth.signOut from v8 compat syntax
        await auth.signOut();
        setUser(null);
        window.location.hash = '#/login';
    };

    const renderPage = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div></div>;
        }

        if (!user) {
            return <LoginPage />;
        }
        
        const [path, param] = route.substring(2).split('/');

        switch (path) {
            case 'dashboard':
                return <DashboardPage />;
            case 'event':
                 return <EventDetailPage eventId={param} user={user} />;
            case 'collaborators':
                return <CollaboratorsPage />;
            case 'equipment':
                return <EquipmentPage />;
            case 'calendar':
                return <CalendarPage />;
            case 'login':
                 return <LoginPage />;
            default:
                window.location.hash = '#/dashboard';
                return <DashboardPage />;
        }
    };
    
    return (
        <div className="flex h-screen bg-gray-100 text-gray-800">
            {user && !loading && (
                <Sidebar 
                    onLogout={handleLogout} 
                    isCollapsed={isSidebarCollapsed}
                    onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            )}
            <main className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
                {renderPage()}
            </main>
        </div>
    );
}

// --- Pages & Sub-components ---

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            if (isRegistering) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
            window.location.hash = '#/dashboard';
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 w-full">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border">
                <div className="flex justify-center mb-6">
                    <img src="https://firebasestorage.googleapis.com/v0/b/crm-f2.firebasestorage.app/o/LOGOS%2F440660162_446023151212681_5294145233333193669_n.jpg?alt=media&token=4ddab625-5d61-4058-976f-f7f187785922" alt="CRM F2 Logo" className="h-12" />
                </div>
                <h2 className="text-xl font-bold text-center text-gray-700 mb-6">
                    {isRegistering ? 'Criar Nova Conta' : 'Acessar Plataforma'}
                </h2>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</p>}
                <form onSubmit={handleAuth}>
                    <div className="mb-4">
                        <label className="block text-gray-600 mb-2" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-gray-50 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-600 mb-2" htmlFor="password">Senha</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-50 text-gray-800 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300">
                        {isRegistering ? 'Registrar' : 'Entrar'}
                    </button>
                </form>
                <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="w-full mt-4 text-center text-blue-600 hover:underline"
                >
                    {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Registre-se'}
                </button>
            </div>
        </div>
    );
}

const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>;

function Sidebar({ onLogout, isCollapsed, onToggle }: { onLogout: () => void; isCollapsed: boolean; onToggle: () => void; }) {
    const navItems = [
        { name: 'Dashboard', icon: <HomeIcon />, hash: '#/dashboard' },
        { name: 'Calendário', icon: <CalendarIcon />, hash: '#/calendar' },
        { name: 'Colaboradores', icon: <UsersIcon />, hash: '#/collaborators' },
        { name: 'Equipamentos', icon: <CubeIcon />, hash: '#/equipment' },
    ];
    
    const [active, setActive] = useState(window.location.hash);

    useEffect(() => {
        const handleHashChange = () => setActive(window.location.hash);
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return (
        <aside className={`fixed top-0 left-0 h-full bg-white p-4 flex flex-col justify-between border-r border-gray-200 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
            <div>
                <div className={`mb-10 flex ${isCollapsed ? 'justify-center' : 'justify-between'} items-center`}>
                    {!isCollapsed && <img src="https://firebasestorage.googleapis.com/v0/b/crm-f2.firebasestorage.app/o/LOGOS%2F440660162_446023151212681_5294145233333193669_n.jpg?alt=media&token=4ddab625-5d61-4058-976f-f7f187785922" alt="CRM F2 Logo" className="h-12 transition-opacity duration-300" />}
                    <button onClick={onToggle} className="p-2 rounded-full hover:bg-gray-100">
                        {isCollapsed ? <ArrowRightIcon /> : <ArrowLeftIcon />}
                    </button>
                </div>
                <nav>
                    <ul>
                        {navItems.map(item => (
                            <li key={item.name} className="mb-4">
                                <a 
                                    href={item.hash} 
                                    className={`flex items-center p-2 rounded-md transition-colors ${active === item.hash ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${isCollapsed ? 'justify-center' : ''}`}
                                >
                                    {item.icon}
                                    {!isCollapsed && <span className="ml-4">{item.name}</span>}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <button
                onClick={onLogout}
                className={`flex items-center p-2 w-full rounded-md text-gray-600 hover:bg-red-100 hover:text-red-700 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            >
                <LogoutIcon />
                {!isCollapsed && <span className="ml-4">Sair</span>}
            </button>
        </aside>
    );
}

const EventCard: React.FC<{ event: EventData }> = ({ event }) => {
    const statusColor = getStatusColor(event.status);
    const shortDate = (dateStr: string | undefined) => {
        if (!dateStr) return 'N/D';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Inválida';
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
    };

    return (
        <div 
            className="bg-white rounded-lg shadow-md border border-gray-200 p-4 cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all"
            onClick={() => window.location.hash = `#/event/${event.id}`}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-800 pr-2">{event.briefing.eventName || 'Evento Sem Nome'}</h3>
                <div className="flex-shrink-0">
                    <span className={`w-4 h-4 rounded-full inline-block ${statusColor}`}></span>
                </div>
            </div>
            <div className="flex justify-between items-center text-sm text-gray-600">
                <span>{shortDate(event.briefing.dataInicio)} - {shortDate(event.briefing.dataFim)}</span>
                <span className="font-semibold bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                    OS: {event.briefing.osVersion || event.id.substring(0, 6)}
                </span>
            </div>
        </div>
    );
};


function DashboardPage() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const eventsCollection = db.collection('events');
        const q = eventsCollection.orderBy('createdAt', 'desc');
        const eventSnapshot = await q.get();
        const eventList = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData));
        setEvents(eventList);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleCreateEvent = () => {
        setIsModalOpen(true);
    };
    
    const groupedEvents = useMemo(() => {
        return events.reduce((acc, event) => {
            const monthYear = formatMonthYear(event.createdAt.toDate());
            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(event);
            return acc;
        }, {} as Record<string, EventData[]>);
    }, [events]);

    if (loading) return <div>Carregando eventos...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800">Dashboard de Eventos</h2>
                <button onClick={handleCreateEvent} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition duration-300">
                    <PlusIcon /> Criar Nova OS
                </button>
            </div>

            {Object.keys(groupedEvents).length > 0 ? (
                Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
                    <div key={monthYear} className="mb-10">
                        <h3 className="text-2xl font-semibold mb-4 border-b-2 border-gray-200 pb-2 text-gray-700">{monthYear}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {monthEvents.map(event => <EventCard key={event.id} event={event} />)}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
                    <p className="text-gray-500">Nenhum evento encontrado.</p>
                    <p className="text-gray-400 mt-2">Crie uma nova OS para começar!</p>
                </div>
            )}

            <EventFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={fetchEvents}
                eventData={null}
            />
        </div>
    );
}

function EventFormModal({ isOpen, onClose, onSave, eventData }: { isOpen: boolean, onClose: () => void, onSave: () => void, eventData: Partial<EventData> | null }) {
    const [briefing, setBriefing] = useState<Partial<Briefing>>({});
    const [status, setStatus] = useState<EventStatus>(EventStatus.Orcamento);
    const user = auth.currentUser;

    useEffect(() => {
        setBriefing(eventData?.briefing || {});
        setStatus(eventData?.status || EventStatus.Orcamento);
    }, [eventData, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
        setBriefing(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleCollaboratorChange = (selectedIds: string[]) => {
        setBriefing(prev => ({ ...prev, equipeF2: selectedIds }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !briefing.eventName) {
            alert('Nome do evento é obrigatório.');
            return;
        }

        try {
            if (eventData?.id) {
                // Fix: Use db.collection().doc().update() from v8 compat syntax
                const eventRef = db.collection('events').doc(eventData.id);
                await eventRef.update({ briefing, status });
            } else {
                const newEvent: Omit<EventData, 'id'> = {
                    briefing,
                    status,
                    // Fix: Use firebase.firestore.Timestamp.now() from v8 compat syntax
                    createdAt: firebase.firestore.Timestamp.now(),
                    creatorUid: user.uid,
                    creatorEmail: user.email || 'N/A',
                };
                // Fix: Use db.collection().add() from v8 compat syntax
                await db.collection('events').add(newEvent);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Falha ao salvar evento.");
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={eventData?.id ? "Editar OS/Evento" : "Criar Nova OS/Evento"}>
            <form onSubmit={handleSubmit}>
                {(Object.values(briefingSections) as { title: string; fields: BriefingField[] }[]).map((section) => (
                    <div key={section.title}>
                         <h4 className="text-lg font-semibold mb-4 text-blue-600 pt-4 border-t border-gray-200 first:border-t-0 first:pt-0">{section.title}</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            {section.fields.map(field => {
                                if (field.name === 'equipeF2') {
                                    return (
                                        <div key={field.name} className="md:col-span-2 mb-4">
                                            <CollaboratorSelector
                                                selected={(briefing.equipeF2 || []) as string[]}
                                                onChange={handleCollaboratorChange}
                                            />
                                        </div>
                                    );
                                }
                                return (
                                    <FormField 
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        value={(briefing[field.name as keyof Briefing] as any) || ''}
                                        onChange={handleChange}
                                        type={field.type || 'text'}
                                        as={field.as || 'input'}
                                        required={field.required}
                                    />
                                );
                            })}
                         </div>
                    </div>
                ))}

                 <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end items-center gap-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">Cancelar</button>
                    <button type="submit" className="py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold">Salvar Evento</button>
                </div>
            </form>
        </Modal>
    );
}

const DetailItem: React.FC<{label: string; value: any; isDate?: boolean; allCollaborators?: Collaborator[]}> = ({ label, value, isDate, allCollaborators }) => {
    if (!value) return null;

    let displayValue = isDate ? formatDate(value) : value.toString();

    if (label === 'Equipe F2' && Array.isArray(value) && allCollaborators) {
        displayValue = value.map(id => {
            const collaborator = allCollaborators.find(c => c.id === id);
            return collaborator ? `${collaborator.nome} (${collaborator.cargo})` : 'ID Desconhecido';
        }).join(', ');
    }


    return (
        <div className="py-2">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-md text-gray-800">{displayValue}</p>
        </div>
    )
};

// --- PDF Export Template ---
const PDFExportTemplate: React.FC<{
    event: EventData;
    options: { exportType: string; sections: { budget: boolean; briefing: boolean; debriefing: boolean; } };
    allCollaborators: Collaborator[];
    id: string;
}> = ({ event, options, allCollaborators, id }) => (
    <div id={id} className="absolute -left-full w-full p-8 bg-white" style={{ width: '210mm' }}>
        {/* Render all selected sections here in order */}
        <h2>Template de PDF</h2>
    </div>
);

// --- Export Options Modal ---
const ExportOptionsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onExport: (options: any) => void;
}> = ({ isOpen, onClose, onExport }) => {
    const [exportType, setExportType] = useState('budget');
    const [sections, setSections] = useState({
        budget: true,
        briefing: true,
        debriefing: true,
    });

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSections(prev => ({ ...prev, [name]: checked }));
    };

    const handleExport = () => {
        onExport({ exportType, sections });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Opções de Exportação para PDF">
            <div className="space-y-6">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Formato da Lista de Materiais</h4>
                    <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md p-2">
                        <option value="budget">Orçamento (com valores)</option>
                        <option value="list">Lista de Materiais (sem valores)</option>
                    </select>
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 mb-2">Seções para Incluir</h4>
                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input type="checkbox" name="budget" checked={sections.budget} onChange={handleCheckboxChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            <span className="ml-2 text-gray-800">Lista de Materiais/Orçamento</span>
                        </label>
                        <label className="flex items-center">
                            <input type="checkbox" name="briefing" checked={sections.briefing} onChange={handleCheckboxChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            <span className="ml-2 text-gray-800">Briefing</span>
                        </label>
                        <label className="flex items-center">
                            <input type="checkbox" name="debriefing" checked={sections.debriefing} onChange={handleCheckboxChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                            <span className="ml-2 text-gray-800">Debriefing</span>
                        </label>
                    </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-gray-800">Cancelar</button>
                    <button onClick={handleExport} className="py-2 px-4 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold">Gerar PDF</button>
                </div>
            </div>
        </Modal>
    );
};


// --- Budget Section Component ---
const BudgetSection: React.FC<{
    event: EventData;
    onUpdate: (updatedData: Partial<EventData>) => Promise<void>;
}> = ({ event, onUpdate }) => {
    const [items, setItems] = useState<BudgetItem[]>(event.budgetItems || []);
    const [newItem, setNewItem] = useState({ name: '', quantity: 1, days: 1, dailyRate: 0 });

    const handleEquipmentSelect = (equipment: Equipment) => {
        setNewItem(prev => ({
            ...prev,
            name: equipment.nome,
            dailyRate: equipment.valorUnitario || 0,
        }));
    };

    useEffect(() => {
        setItems(event.budgetItems || []);
    }, [event.budgetItems]);

    const handleSave = async (itemsToSave: BudgetItem[]) => {
        try {
            await onUpdate({ budgetItems: itemsToSave });
        } catch (error) {
            console.error("Failed to save budget items:", error);
            alert("Falha ao salvar o orçamento.");
        }
    };

    const handleAddItem = () => {
        if (!newItem.name || newItem.quantity <= 0 || newItem.days <= 0 || newItem.dailyRate < 0) {
            alert("Por favor, preencha todos os campos do item corretamente.");
            return;
        }
        const total = newItem.quantity * newItem.days * newItem.dailyRate;
        const itemToAdd: BudgetItem = { ...newItem, id: new Date().toISOString(), total };
        
        const updatedItems = [...items, itemToAdd];
        setItems(updatedItems);
        handleSave(updatedItems);
        setNewItem({ name: '', quantity: 1, days: 1, dailyRate: 0 }); // Reset form
    };
    
    const handleDeleteItem = (itemId: string) => {
        if (window.confirm("Tem certeza que deseja excluir este item?")) {
            const updatedItems = items.filter(item => item.id !== itemId);
            setItems(updatedItems);
            handleSave(updatedItems);
        }
    };

    const handleNewItemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setNewItem(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const totalBudget = useMemo(() => {
        return items.reduce((sum, item) => sum + (item.total || 0), 0);
    }, [items]);

    return (
        <div>
            {/* Form for new item */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                 <div className="md:col-span-2">
                    <EquipmentSelector onSelect={handleEquipmentSelect} />
                </div>
                <div>
                    <FormField label="Qtd." name="quantity" type="number" value={newItem.quantity} onChange={handleNewItemChange} />
                </div>
                <div>
                    <FormField label="Diárias" name="days" type="number" value={newItem.days} onChange={handleNewItemChange} />
                </div>
                <div>
                    <FormField label="Valor Diária (R$)" name="dailyRate" type="number" value={newItem.dailyRate} onChange={handleNewItemChange} />
                </div>
                <div className="flex items-end mb-4">
                    <button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg w-full h-[42px]">Adicionar</button>
                </div>
            </div>

            {/* Table of items */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600">Item</th>
                            <th className="p-4 font-semibold text-gray-600">Nome</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Qtd.</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Diárias</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Valor Diária</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Valor Total</th>
                            <th className="p-4 font-semibold text-gray-600 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length > 0 ? items.map((item, index) => (
                            <tr key={item.id} className="border-b hover:bg-gray-50">
                                <td className="p-4">{index + 1}</td>
                                <td className="p-4 font-medium">{item.name}</td>
                                <td className="p-4 text-right">{item.quantity}</td>
                                <td className="p-4 text-right">{item.days}</td>
                                <td className="p-4 text-right">R$ {item.dailyRate.toFixed(2)}</td>
                                <td className="p-4 text-right font-semibold">R$ {item.total.toFixed(2)}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleDeleteItem(item.id)} className="text-red-600 hover:text-red-800 font-medium">Excluir</button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="text-center p-8 text-gray-500">Nenhum item adicionado ao orçamento.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Total */}
            {items.length > 0 && (
                <div className="mt-6 text-right pr-4">
                    <h4 className="text-2xl font-bold text-gray-800">Total Geral: R$ {totalBudget.toFixed(2)}</h4>
                </div>
            )}
        </div>
    );
};


function EventDetailPage({ eventId, user }: { eventId: string, user: firebase.User }) {
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [allCollaborators, setAllCollaborators] = useState<Collaborator[]>([]);
    const [activeTab, setActiveTab] = useState('budget');

    const handleUpdateEvent = async (updatedData: Partial<EventData>) => {
        if (event) {
            const eventRef = db.collection('events').doc(event.id);
            await eventRef.update(updatedData);
            // Refresh event data locally to reflect the change
            setEvent(prev => prev ? {...prev, ...updatedData} : null);
        }
    };

    useEffect(() => {
        const fetchCollaborators = async () => {
            try {
                const snapshot = await db.collection("collaborators").orderBy("nome").get();
                const collabs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
                setAllCollaborators(collabs);
            } catch (error) {
                console.error("Error fetching collaborators for detail view:", error);
            }
        };
        fetchCollaborators();
    }, []);

    const fetchEvent = useCallback(async () => {
      setLoading(true);
      const eventRef = db.collection('events').doc(eventId);
      const eventSnap = await eventRef.get();
      if (eventSnap.exists) {
        setEvent({ id: eventSnap.id, ...eventSnap.data() } as EventData);
      }
      setLoading(false);
    }, [eventId]);

    useEffect(() => {
        fetchEvent();
    }, [fetchEvent]);

    const handleStatusChange = async (newStatus: EventStatus) => {
        if (event) {
            const eventRef = db.collection('events').doc(event.id);
            await eventRef.update({ status: newStatus });
            setEvent(prev => prev ? {...prev, status: newStatus} : null);
        }
    };
    
    if (loading) return <div>Carregando evento...</div>;
    if (!event) return <div>Evento não encontrado. <a href="#/dashboard" className="text-blue-600 hover:underline">Voltar</a></div>;

    const eventStatusOptions = (Object.values(EventStatus) as string[]).map(status => (
      <option key={status} value={status}>{status}</option>
    ));

    const handleExportPDF = () => {
        const input = document.getElementById('pdf-content');
        if (!input || !event) return;
        setIsExporting(true);
        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const width = pdfWidth;
            const height = width / ratio;
            let position = 0;
            let heightLeft = height;
            pdf.addImage(imgData, 'PNG', 0, position, width, height);
            heightLeft -= pdfHeight;
            while (heightLeft > 0) {
                position = heightLeft - height;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, width, height);
                heightLeft -= pdfHeight;
            }
            pdf.save(`OS-${event.briefing.osVersion || event.id}.pdf`);
            setIsExporting(false);
        });
    };

    const headerSections = [
        briefingSections.identificacaoProjeto,
        briefingSections.direcao,
        briefingSections.dadosGerais
    ];

    const briefingTabSections = [
        briefingSections.datas,
        briefingSections.escopo,
        briefingSections.operacional,
        briefingSections.terceiros,
        briefingSections.local
    ];

    const TabButton: React.FC<{tabName: string; label: string}> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveTab(tabName)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
                ${activeTab === tabName 
                    ? 'border-b-2 border-blue-600 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div id="pdf-content">
            <div className="space-y-6">
                {/* --- HEADER CARD --- */}
                <div className="p-6 bg-white rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-800">{event.briefing.eventName}</h2>
                             <p className="text-xs text-gray-500 mt-2">OS criada por {event.creatorEmail} em {formatTimestamp(event.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                            <button onClick={() => setIsExportModalOpen(true)} disabled={isExporting} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
                                {isExporting ? 'Exportando...' : 'Exportar para PDF'}
                            </button>
                            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full text-white ${getStatusColor(event.status)}`}>
                                {event.status}
                            </span>
                            <select 
                                value={event.status} 
                                onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
                                className="bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {eventStatusOptions}
                            </select>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                            {headerSections.flatMap(s => s.fields).map(field => (
                                <DetailItem 
                                    key={field.name}
                                    label={field.label}
                                    value={event.briefing[field.name as keyof Briefing]}
                                    isDate={field.type === 'date' || field.type === 'datetime-local'}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- TABS --- */}
                <div>
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <TabButton tabName="budget" label="Lista de Materiais" />
                            <TabButton tabName="briefing" label="Briefing" />
                            <TabButton tabName="debriefing" label="Debriefing" />
                        </nav>
                    </div>

                    <div className="mt-6">
                        {/* BUDGET TAB */}
                        {activeTab === 'budget' && (
                            <div className="p-6 bg-white rounded-lg border border-gray-200">
                                <h3 className="text-2xl font-semibold mb-4 border-b border-gray-200 pb-2">Orçamento</h3>
                                <BudgetSection event={event} onUpdate={handleUpdateEvent} />
                            </div>
                        )}

                        {/* BRIEFING TAB */}
                        {activeTab === 'briefing' && (
                            <div className="p-6 bg-white rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                                    <h3 className="text-2xl font-semibold text-gray-800">Briefing (Pré-evento)</h3>
                                    <button onClick={() => setIsBriefingModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Editar Briefing</button>
                                </div>
                                {briefingTabSections.map(section => (
                                    <div key={section.title}>
                                        <h4 className="text-lg font-semibold mt-4 text-blue-600">{section.title}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
                                            {section.fields.map(field => (
                                                <DetailItem 
                                                    key={field.name}
                                                    label={field.label}
                                                    value={event.briefing[field.name as keyof Briefing]}
                                                    isDate={field.type === 'date' || field.type === 'datetime-local'}
                                                    allCollaborators={field.name === 'equipeF2' ? allCollaborators : undefined}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* DEBRIEFING TAB */}
                        {activeTab === 'debriefing' && (
                            <div className="p-6 bg-white rounded-lg border border-gray-200">
                                <h3 className="text-2xl font-semibold mb-4 border-b border-gray-200 pb-2">Debriefing (Pós-evento)</h3>
                                {event.debriefing ? (
                                    <p className="text-gray-700">Debriefing preenchido.</p>
                                ) : (
                                    <p className="text-gray-500">Nenhum debriefing preenchido ainda.</p>
                                )}
                                <button className="mt-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                                    {event.debriefing ? 'Ver/Editar Debriefing' : 'Criar Debriefing'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <EventFormModal
                    isOpen={isBriefingModalOpen}
                    onClose={() => setIsBriefingModalOpen(false)}
                    onSave={fetchEvent}
                    eventData={event}
                />
                <ExportOptionsModal 
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    onExport={handleExportPDF}
                />
            </div>
        </div>
    );
}

function ManagementTable<T extends {id: string}>({ title, data, columns, onAdd, onEdit, onDelete, loading, error }: {
    title: string; // Title is now optional as it's handled outside for CollaboratorsPage
    data: T[];
    columns: { key: keyof T, header: string }[];
    onAdd: () => void;
    onEdit: (item: T) => void;
    onDelete: (id: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}) {
    const topScrollRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [tableWidth, setTableWidth] = useState(0);

    useEffect(() => {
        const tableEl = tableContainerRef.current?.querySelector('table');
        if (tableEl) {
            const updateWidth = () => setTableWidth(tableEl.scrollWidth);
            updateWidth();
            const resizeObserver = new ResizeObserver(updateWidth);
            resizeObserver.observe(tableEl);
            return () => resizeObserver.disconnect();
        }
    }, [data, columns, loading]);

    useEffect(() => {
        const topScroll = topScrollRef.current;
        const tableContainer = tableContainerRef.current;
        if (!topScroll || !tableContainer) return;

        let isSyncing = false;
        const syncTopToTable = () => {
            if (!isSyncing) {
                isSyncing = true;
                topScroll.scrollLeft = tableContainer.scrollLeft;
                isSyncing = false;
            }
        };
        const syncTableToTop = () => {
            if (!isSyncing) {
                isSyncing = true;
                tableContainer.scrollLeft = topScroll.scrollLeft;
                isSyncing = false;
            }
        };

        topScroll.addEventListener('scroll', syncTableToTop);
        tableContainer.addEventListener('scroll', syncTopToTable);

        return () => {
            topScroll.removeEventListener('scroll', syncTableToTop);
            tableContainer.removeEventListener('scroll', syncTopToTable);
        };
    }, []);

    return (
        <div>
            {title && (
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition duration-300">
                        <PlusIcon /> Adicionar Novo
                    </button>
                </div>
            )}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">{error}</div>}
            
            <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden" style={{ height: '16px' }}>
                 <div style={{ width: `${tableWidth}px`, height: '1px' }}></div>
            </div>

            <div ref={tableContainerRef} className="bg-white rounded-lg overflow-x-auto border border-gray-200" style={{maxHeight: '60vh'}}>
                <table className="w-full text-left whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                        <tr>
                            {columns.map(col => <th key={String(col.key)} className="p-4 font-semibold text-gray-600">{col.header}</th>)}
                            <th className="p-4 font-semibold text-right text-gray-600 sticky right-0 bg-gray-50 z-10">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr>
                                <td colSpan={columns.length + 1} className="text-center p-8">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                        <span className="ml-4 text-gray-500">Carregando...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length > 0 ? (
                            data.map(item => (
                                <tr key={item.id} className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50">
                                    {columns.map(col => <td key={String(col.key)} className="p-4 text-gray-700">{(item[col.key] as any) || 'N/A'}</td>)}
                                    <td className="p-4 text-right sticky right-0 bg-white hover:bg-gray-50">
                                        <button onClick={() => onEdit(item)} className="text-yellow-600 hover:text-yellow-700 mr-4 font-medium">Editar</button>
                                        <button onClick={() => onDelete(item.id)} className="text-red-600 hover:text-red-700 font-medium">Excluir</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center p-8 text-gray-500">
                                    Nenhum item encontrado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CSVImporter({ onImport, isImporting }: { onImport: (data: Partial<Collaborator>[]) => Promise<void>, isImporting: boolean }) {
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);

        Papa.parse<any>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            complete: async (results) => {
                try {
                    if (!Array.isArray(results.data)) {
                        throw new Error("Parsed CSV data is not an array.");
                    }
                    const collaborators: Partial<Collaborator>[] = results.data.map((row: any) => ({
                        nome: row['NOME'],
                        apelido: row['APELIDO'],
                        cargo: row['CARGO'],
                        cpf: row['CPF'],
                        rg: row['RG'],
                        nascimento: row['NASCIMENTO'],
                        cnpj: row['CNPJ'],
                        email: row['EMAIL'],
                        telefone: row['TELEFONE'],
                        banco: row['BANCO'],
                        codBanco: row['CÓD.'],
                        agencia: row['AGÊNCIA'],
                        conta: row['CONTA'],
                        chavePix: row['CHAVE PIX'],
                        categoria: row['CATEGORIA'] as CollaboratorCategory,
                        tipo: row['TIPO'],
                        cacheTecnico: row['CACHÊ TÉCNICO'] ? parseFloat(String(row['CACHÊ TÉCNICO']).replace(',', '.')) : null,
                        cacheProgramador: row['CACHÊ PROGRAMADOR'] ? parseFloat(String(row['CACHÊ PROGRAMADOR']).replace(',', '.')) : null,
                    }));
                    
                    await onImport(collaborators);
                    alert('Importação concluída com sucesso!');
                } catch (err) {
                    console.error("Error processing CSV data:", err);
                    setError('Erro ao processar os dados do CSV. Verifique o formato do arquivo e os tipos de dados.');
                }
            },
            error: (err) => {
                console.error("PapaParse error:", err);
                setError('Erro ao ler o arquivo CSV.');
            }
        });
    };

    return (
        <div className="my-6 p-4 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold mb-2 text-gray-700">Importar em Lote via CSV</h3>
            <p className="text-sm text-gray-600 mb-4">
                Selecione um arquivo CSV para adicionar múltiplos colaboradores de uma vez. Certifique-se que o arquivo segue a ordem e nome das colunas esperadas.
            </p>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isImporting}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            />
            {isImporting && <p className="text-blue-600 mt-2 animate-pulse">Importando, por favor aguarde...</p>}
            {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
    );
}

function CollaboratorsPage() {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Collaborator | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [cargoFilter, setCargoFilter] = useState('');

    const filteredCollaborators = useMemo(() => {
        return collaborators.filter(c => {
            const matchesCargo = cargoFilter ? c.cargo === cargoFilter : true;
            const matchesSearch = searchTerm ? c.nome.toLowerCase().includes(searchTerm.toLowerCase()) : true;
            return matchesCargo && matchesSearch;
        });
    }, [collaborators, searchTerm, cargoFilter]);

    const fetchCollaborators = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fix: Use db.collection().orderBy().get() from v8 compat syntax
            const querySnapshot = await db.collection("collaborators").orderBy("nome").get();
            setCollaborators(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator)));
        } catch (error) {
            console.error("Error fetching collaborators:", error);
            setError("Falha ao carregar colaboradores. Verifique a conexão e as permissões do Firebase.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);
    
    const handleSave = async (data: Partial<Collaborator>) => {
        try {
            if(editing?.id) {
                // Fix: Use db.collection().doc().update() from v8 compat syntax
                await db.collection("collaborators").doc(editing.id).update(data);
            } else {
                // Fix: Use db.collection().add() from v8 compat syntax
                await db.collection("collaborators").add(data);
            }
            fetchCollaborators();
            setIsModalOpen(false);
        } catch(e) { console.error(e); alert("Erro ao salvar.")}
    }

    const handleImport = async (importedData: Partial<Collaborator>[]) => {
        setIsImporting(true);
        try {
            const batch = db.batch();
            importedData.forEach(collab => {
                if (collab.nome) { // Basic validation
                    const docRef = db.collection("collaborators").doc();
                    batch.set(docRef, collab);
                }
            });
            await batch.commit();
            fetchCollaborators(); // Refresh data
        } catch (e) {
            console.error("Error during batch import:", e);
            alert("Ocorreu um erro durante a importação. Verifique o console para mais detalhes.");
        } finally {
            setIsImporting(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Tem certeza que deseja excluir este colaborador?")) {
            // Fix: Use db.collection().doc().delete() from v8 compat syntax
            await db.collection("collaborators").doc(id).delete();
            fetchCollaborators();
        }
    }

    const cargoOptions = useMemo(() => {
        const cargos = [...new Set(collaborators.map(c => c.cargo).filter(Boolean))];
        return [
            { value: '', label: 'Todos os Cargos' },
            ...cargos.map(c => ({ value: c as string, label: c as string }))
        ];
    }, [collaborators]);

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Gerenciar Colaboradores</h2>
                <button onClick={() => { setEditing(null); setIsModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center transition duration-300">
                    <PlusIcon /> Adicionar Novo
                </button>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white border border-gray-200 rounded-lg">
                <input
                    type="text"
                    placeholder="Pesquisar por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                    value={cargoFilter}
                    onChange={e => setCargoFilter(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    {cargoOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </div>

            <ManagementTable<Collaborator>
                title=""
                data={filteredCollaborators}
                columns={[
                    { key: 'nome', header: 'Nome' },
                    { key: 'apelido', header: 'Apelido' },
                    { key: 'cargo', header: 'Cargo' },
                    { key: 'cpf', header: 'CPF' },
                    { key: 'rg', header: 'RG' },
                    { key: 'nascimento', header: 'Nascimento' },
                    { key: 'cnpj', header: 'CNPJ' },
                    { key: 'email', header: 'Email' },
                    { key: 'telefone', header: 'Telefone' },
                    { key: 'banco', header: 'Banco' },
                    { key: 'codBanco', header: 'Cód.' },
                    { key: 'agencia', header: 'Agência' },
                    { key: 'conta', header: 'Conta' },
                    { key: 'chavePix', header: 'Chave PIX' },
                    { key: 'categoria', header: 'Categoria' },
                    { key: 'tipo', header: 'Tipo' },
                    { key: 'cacheTecnico', header: 'Cachê Técnico' },
                    { key: 'cacheProgramador', header: 'Cachê Programador' },
                ]}
                onAdd={() => {}} // Moved button outside
                onEdit={(item) => { setEditing(item); setIsModalOpen(true); }}
                onDelete={handleDelete}
                loading={loading}
                error={error}
            />
            <CollaboratorFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                collaborator={editing}
            />
            <CSVImporter onImport={handleImport} isImporting={isImporting} />
        </>
    );
}

function CollaboratorFormModal({isOpen, onClose, onSave, collaborator}: {isOpen: boolean, onClose: () => void, onSave: (data: Partial<Collaborator>) => void, collaborator: Collaborator | null}) {
    const [formData, setFormData] = useState<Partial<Collaborator>>({});
    useEffect(() => {
        setFormData(collaborator || { categoria: CollaboratorCategory.Freelancer });
    }, [collaborator, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        const finalValue = type === 'number' ? (value === '' ? null : parseFloat(value)) : value;
        setFormData(prev => ({...prev, [name]: finalValue}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const categoryOptions = Object.keys(CollaboratorCategory).map(key => ({
        value: CollaboratorCategory[key as keyof typeof CollaboratorCategory],
        label: CollaboratorCategory[key as keyof typeof CollaboratorCategory]
    }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={collaborator ? "Editar Colaborador" : "Adicionar Colaborador"}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4">
                <div className="lg:col-span-3"><FormField label="Nome Completo" name="nome" value={formData.nome || ''} onChange={handleChange} required/></div>
                <FormField label="Apelido" name="apelido" value={formData.apelido || ''} onChange={handleChange} />
                <FormField label="Cargo" name="cargo" value={formData.cargo || ''} onChange={handleChange} />
                <FormField as="select" label="Categoria" name="categoria" value={formData.categoria || ''} onChange={handleChange} options={categoryOptions} />
                
                <div className="lg:col-span-3 pt-4 mt-4 border-t"><h4 className="text-md font-semibold text-gray-600">Documentos</h4></div>
                <FormField label="CPF" name="cpf" value={formData.cpf || ''} onChange={handleChange} />
                <FormField label="RG" name="rg" value={formData.rg || ''} onChange={handleChange} />
                <FormField label="CNPJ" name="cnpj" value={formData.cnpj || ''} onChange={handleChange} />
                <FormField label="Nascimento" name="nascimento" type="date" value={formData.nascimento || ''} onChange={handleChange} />

                <div className="lg:col-span-3 pt-4 mt-4 border-t"><h4 className="text-md font-semibold text-gray-600">Contato</h4></div>
                <FormField label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
                <FormField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleChange} />

                <div className="lg:col-span-3 pt-4 mt-4 border-t"><h4 className="text-md font-semibold text-gray-600">Dados Bancários</h4></div>
                <FormField label="Banco" name="banco" value={formData.banco || ''} onChange={handleChange} />
                <FormField label="Cód. Banco" name="codBanco" value={formData.codBanco || ''} onChange={handleChange} />
                <FormField label="Agência" name="agencia" value={formData.agencia || ''} onChange={handleChange} />
                <FormField label="Conta" name="conta" value={formData.conta || ''} onChange={handleChange} />
                <FormField label="Chave PIX" name="chavePix" value={formData.chavePix || ''} onChange={handleChange} />
                
                <div className="lg:col-span-3 pt-4 mt-4 border-t"><h4 className="text-md font-semibold text-gray-600">Financeiro</h4></div>
                <FormField label="Tipo" name="tipo" value={formData.tipo || ''} onChange={handleChange} />
                <FormField label="Cachê Técnico" name="cacheTecnico" type="number" value={formData.cacheTecnico || ''} onChange={handleChange} />
                <FormField label="Cachê Programador" name="cacheProgramador" type="number" value={formData.cacheProgramador || ''} onChange={handleChange} />

                 <div className="lg:col-span-3 mt-6 text-right">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 mr-4">Cancelar</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Salvar</button>
                </div>
            </form>
        </Modal>
    );
}

function EquipmentPage() {
    const [equipment, setEquipment] = useState<Equipment[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Equipment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEquipment = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fix: Use db.collection().orderBy().get() from v8 compat syntax
            const querySnapshot = await db.collection("equipment").orderBy("nome").get();
            setEquipment(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
        } catch(error) {
            console.error("Error fetching equipment:", error);
            setError("Falha ao carregar equipamentos. Verifique a conexão e as permissões do Firebase.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

    const handleSave = async (data: Partial<Equipment>) => {
        try {
            if (editing?.id) {
                // Fix: Use db.collection().doc().update() from v8 compat syntax
                await db.collection("equipment").doc(editing.id).update(data);
            } else {
                // Fix: Use db.collection().add() from v8 compat syntax
                await db.collection("equipment").add(data);
            }
            fetchEquipment();
            setIsModalOpen(false);
        } catch(e) { console.error(e); alert("Erro ao salvar.")}
    }
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Tem certeza que deseja excluir este equipamento?")) {
            // Fix: Use db.collection().doc().delete() from v8 compat syntax
            await db.collection("equipment").doc(id).delete();
            fetchEquipment();
        }
    }

    return (
        <>
            <ManagementTable<Equipment>
                title="Gerenciar Equipamentos"
                data={equipment}
                columns={[
                    { key: 'nome', header: 'Nome' },
                    { key: 'descricao', header: 'Descrição' },
                    { key: 'voltagem', header: 'Voltagem' },
                    { key: 'valorUnitario', header: 'Valor' },
                ]}
                onAdd={() => { setEditing(null); setIsModalOpen(true); }}
                onEdit={(item) => { setEditing(item); setIsModalOpen(true); }}
                onDelete={handleDelete}
                loading={loading}
                error={error}
            />
            <EquipmentFormModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSave} 
                equipmentItem={editing}
            />
        </>
    );
}

function EquipmentFormModal({isOpen, onClose, onSave, equipmentItem}: {isOpen: boolean, onClose: () => void, onSave: (data: Partial<Equipment>) => void, equipmentItem: Equipment | null}) {
    const [formData, setFormData] = useState<Partial<Equipment>>({});
    useEffect(() => {
        setFormData(equipmentItem || {});
    }, [equipmentItem, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value, type} = e.target as HTMLInputElement;
        setFormData(prev => ({...prev, [name]: type === 'number' ? parseFloat(value) : value}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={equipmentItem ? "Editar Equipamento" : "Adicionar Equipamento"}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <div className="md:col-span-2"><FormField label="Nome" name="nome" value={formData.nome || ''} onChange={handleChange} required/></div>
                <div className="md:col-span-2"><FormField as="textarea" label="Descrição" name="descricao" value={formData.descricao || ''} onChange={handleChange} /></div>
                <FormField label="Dimensões" name="dimensoes" value={formData.dimensoes || ''} onChange={handleChange} />
                <FormField label="Peso" name="peso" value={formData.peso || ''} onChange={handleChange} />
                <FormField label="Voltagem" name="voltagem" value={formData.voltagem || ''} onChange={handleChange} />
                <FormField label="Valor Unitário" name="valorUnitario" type="number" value={formData.valorUnitario || 0} onChange={handleChange} />
                <div className="md:col-span-2"><FormField label="URL da Foto" name="fotoUrl" value={formData.fotoUrl || ''} onChange={handleChange} /></div>
                 <div className="md:col-span-2 mt-4 text-right">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 mr-4">Cancelar</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Salvar</button>
                </div>
            </form>
        </Modal>
    );
}

function CalendarPage() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const getStatusColorForCalendar = (status: EventStatus) => {
        switch (status) {
            case EventStatus.Aprovado: return '#10B981'; // green-500
            case EventStatus.EmAndamento: return '#3B82F6'; // blue-500
            case EventStatus.Concluido: return '#6B7280'; // gray-500
            case EventStatus.Orcamento: return '#F59E0B'; // yellow-500
            default: return '#9CA3AF'; // gray-400
        }
    };

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const eventsCollection = db.collection('events');
                const eventSnapshot = await eventsCollection.get();
                const eventList: any[] = [];
                eventSnapshot.docs.forEach(doc => {
                    const data = doc.data() as EventData;
                    const color = getStatusColorForCalendar(data.status);
                    
                    // Main event
                    if (data.briefing.dataInicio && data.briefing.dataFim) {
                        eventList.push({
                            id: doc.id,
                            title: data.briefing.eventName || 'Evento Sem Nome',
                            start: data.briefing.dataInicio,
                            end: data.briefing.dataFim,
                            backgroundColor: color,
                            borderColor: color,
                            extendedProps: { type: 'event' }
                        });
                    }

                    // Montage event
                    if (data.briefing.dataMontagem) {
                        eventList.push({
                            id: `${doc.id}-montagem`,
                            title: `Montagem: ${data.briefing.eventName}`,
                            start: data.briefing.dataMontagem,
                            display: 'list-item',
                            backgroundColor: '#60A5FA', // blue-400
                        });
                    }
                    
                    // Demontage event
                    if (data.briefing.dataDesmontagem) {
                         eventList.push({
                            id: `${doc.id}-desmontagem`,
                            title: `Desmontagem: ${data.briefing.eventName}`,
                            start: data.briefing.dataDesmontagem,
                            display: 'list-item',
                            backgroundColor: '#F87171', // red-400
                        });
                    }
                });
                setEvents(eventList);
            } catch (error) {
                console.error("Error fetching events for calendar:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const handleEventClick = (clickInfo: any) => {
        const eventId = clickInfo.event.id.split('-')[0];
        window.location.hash = `#/event/${eventId}`;
    };

    if (loading) {
        return (
            <div>
                <h2 className="text-3xl font-bold mb-6 text-gray-800">Calendário de Eventos</h2>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Calendário de Eventos</h2>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={events}
                    eventClick={handleEventClick}
                    locale='pt-br'
                    buttonText={{
                        today: 'Hoje',
                        month: 'Mês',
                        week: 'Semana',
                        day: 'Dia'
                    }}
                    height="auto"
                    contentHeight="auto"
                    aspectRatio={1.8}
                    eventTimeFormat={{
                        hour: '2-digit',
                        minute: '2-digit',
                        meridiem: false
                    }}
                />
            </div>
        </div>
    );
}
