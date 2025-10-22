import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from './services/firebase';
// Fix: Import firebase compat to use v8 syntax
import firebase from 'firebase/compat/app';
import { EventData, EventStatus, Briefing, Collaborator, Equipment, CollaboratorCategory, Debriefing, Timestamp } from './types';

// Icons
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const UsersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 013 1.803M15 21a9 9 0 00-9-5.197M15 11a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const CubeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7l8 4" /></svg>;
const LogoutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>;

// --- Briefing Configuration ---
const briefingSections = {
  identificacao: {
    title: '1.1. Identificação do Projeto',
    fields: [
      { name: 'eventName', label: 'Nome do Evento', required: true },
      { name: 'client', label: 'Cliente' },
      { name: 'osVersion', label: 'Versão OS' },
      { name: 'location', label: 'Local e Endereço' },
      { name: 'atendimentoF2', label: 'Atendimento F2' },
      { name: 'produtorF2', label: 'Produtor F2' },
      { name: 'direcaoTecnica', label: 'Direção Técnica' },
      { name: 'direcaoArtistica', label: 'Direção Artística' },
      { name: 'produtorMaster', label: 'Produtor Master Cliente' },
    ]
  },
  datas: {
    title: '1.2. Datas e Prazos',
    fields: [
      { name: 'reuniaoBriefing', label: 'Reunião Briefing', type: 'date' },
      { name: 'dataVT', label: 'Data VT', type: 'date' },
      { name: 'dataEntregaTeste', label: 'Data Entrega Teste', type: 'date' },
      { name: 'descargaLocal', label: 'Descarga Local', type: 'datetime-local' },
      { name: 'montagem', label: 'Montagem', type: 'datetime-local' },
      { name: 'ensaio', label: 'Ensaio', type: 'datetime-local' },
      { name: 'dataEvento', label: 'Data Evento', type: 'datetime-local' },
    ]
  },
  escopo: {
    title: '1.3. Escopo e Objetivos',
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
    title: '1.4. Operacional',
    fields: [
      { name: 'equipamentosNossos', label: 'Equipamentos Nossos', as: 'textarea' },
      { name: 'preMontagem', label: 'Pré Montagem' },
      { name: 'brindes', label: 'Brindes' },
      { name: 'relatorios', label: 'Relatórios' },
      { name: 'recebimentoConteudos', label: 'Recebimento Conteúdos' },
      { name: 'equipeF2Campo', label: 'Equipe F2 em Campo', as: 'textarea' },
      { name: 'logisticaEquipe', label: 'Logística Equipe' },
    ]
  },
  terceiros: {
    title: '1.5. Terceiros',
    fields: [
      { name: 'terceirosCenografia', label: 'Terceiros - Cenografia' },
      { name: 'terceirosTecnica', label: 'Terceiros - Técnica' },
      { name: 'equipamentosTerceiros', label: 'Equipamentos Terceiros', as: 'textarea' },
      { name: 'painelLED', label: 'Painel LED' },
    ]
  },
  local: {
    title: '1.6. Local',
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
        case EventStatus.Aprovado: return 'bg-green-500 text-white';
        case EventStatus.EmAndamento: return 'bg-blue-500 text-white';
        case EventStatus.Concluido: return 'bg-gray-500 text-white';
        case EventStatus.Orcamento: return 'bg-yellow-500 text-black';
        default: return 'bg-gray-700';
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
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label}{required && ' *'}</label>
        {as === 'textarea' ? (
            <textarea id={name} name={name} value={value} onChange={onChange} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-accent focus:border-accent" />
        ) : as === 'select' ? (
             <select id={name} name={name} value={value} onChange={onChange} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-accent focus:border-accent">
                {options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        ) : (
            <input type={type} id={name} name={name} value={value} onChange={onChange} required={required} className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-accent focus:border-accent" />
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 pt-10 pb-10 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-2xl font-semibold text-white">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---
export default function App() {
    // Fix: Use firebase.User type from compat library
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);
    const [route, setRoute] = useState(window.location.hash || '#/dashboard');

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
            return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-accent"></div></div>;
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
        <div className="flex h-screen bg-gray-900">
            {user && !loading && <Sidebar onLogout={handleLogout} />}
            <main className="flex-1 p-8 overflow-y-auto">
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
                // Fix: Use auth.createUserWithEmailAndPassword from v8 compat syntax
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                // Fix: Use auth.signInWithEmailAndPassword from v8 compat syntax
                await auth.signInWithEmailAndPassword(email, password);
            }
            window.location.hash = '#/dashboard';
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 w-full">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold text-center text-white mb-6">
                    {isRegistering ? 'Criar Conta' : 'Login CRM F2'}
                </h2>
                {error && <p className="bg-error/20 text-error p-3 rounded mb-4">{error}</p>}
                <form onSubmit={handleAuth}>
                    <div className="mb-4">
                        <label className="block text-gray-300 mb-2" htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-300 mb-2" htmlFor="password">Senha</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <button type="submit" className="w-full bg-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded transition duration-300">
                        {isRegistering ? 'Registrar' : 'Entrar'}
                    </button>
                </form>
                <button
                    onClick={() => setIsRegistering(!isRegistering)}
                    className="w-full mt-4 text-center text-accent hover:underline"
                >
                    {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Registre-se'}
                </button>
            </div>
        </div>
    );
}

function Sidebar({ onLogout }: { onLogout: () => void }) {
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
        <aside className="w-64 bg-gray-800 p-6 flex flex-col justify-between">
            <div>
                <h1 className="text-2xl font-bold text-white mb-10">F2 CRM</h1>
                <nav>
                    <ul>
                        {navItems.map(item => (
                            <li key={item.name} className="mb-4">
                                <a 
                                    href={item.hash} 
                                    className={`flex items-center p-2 rounded-md transition-colors ${active === item.hash ? 'bg-accent text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                                >
                                    {item.icon}
                                    <span className="ml-4">{item.name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
            <button
                onClick={onLogout}
                className="flex items-center p-2 w-full rounded-md text-gray-400 hover:bg-red-800 hover:text-white transition-colors"
            >
                <LogoutIcon />
                <span className="ml-4">Sair</span>
            </button>
        </aside>
    );
}

const EventCard: React.FC<{ event: EventData }> = ({ event }) => (
    <div 
        className="bg-gray-800 rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-accent/50 hover:border-accent border-2 border-transparent transition-all"
        onClick={() => window.location.hash = `#/event/${event.id}`}
    >
        <div className="flex justify-between items-start">
            <h3 className="text-xl font-bold text-white mb-2">{event.briefing.eventName || 'Evento Sem Nome'}</h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(event.status)}`}>
                {event.status}
            </span>
        </div>
        <p className="text-gray-400">Cliente: {event.briefing.client || 'N/A'}</p>
        <p className="text-gray-400">Data: {formatDate(event.briefing.dataEvento)}</p>
        <div className="mt-4 pt-4 border-t border-gray-700 text-right">
             <p className="text-xs text-gray-500">Criado por: {event.creatorEmail}</p>
        </div>
    </div>
);


function DashboardPage() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const fetchEvents = useCallback(async () => {
        setLoading(true);
        // Fix: Use db.collection and orderBy from v8 compat syntax
        const eventsCollection = db.collection('events');
        const q = eventsCollection.orderBy('createdAt', 'desc');
        // Fix: Use .get() to fetch data in v8 compat syntax
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
                <h2 className="text-3xl font-bold">Dashboard de Eventos</h2>
                <button onClick={handleCreateEvent} className="bg-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center transition duration-300">
                    <PlusIcon /> Criar Nova OS
                </button>
            </div>

            {Object.keys(groupedEvents).length > 0 ? (
                Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
                    <div key={monthYear} className="mb-10">
                        <h3 className="text-2xl font-semibold mb-4 border-b-2 border-gray-700 pb-2">{monthYear}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {monthEvents.map(event => <EventCard key={event.id} event={event} />)}
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-gray-400 text-center mt-10">Nenhum evento encontrado. Crie uma nova OS para começar!</p>
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
                {Object.values(briefingSections).map((section) => (
                    <div key={section.title}>
                         <h4 className="text-lg font-semibold mb-4 text-accent pt-4 border-t border-gray-700 first:border-t-0 first:pt-0">{section.title}</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            {section.fields.map(field => (
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
                            ))}
                         </div>
                    </div>
                ))}

                 <div className="mt-6 pt-4 border-t border-gray-600 flex justify-end items-center gap-4">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-600 hover:bg-gray-500">Cancelar</button>
                    <button type="submit" className="py-2 px-4 rounded bg-accent hover:bg-blue-500 text-white font-bold">Salvar Evento</button>
                </div>
            </form>
        </Modal>
    );
}

const DetailItem: React.FC<{label: string; value: any; isDate?: boolean}> = ({ label, value, isDate }) => {
    if (!value) return null;
    const displayValue = isDate ? formatDate(value) : value.toString();
    return (
        <div className="py-2">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-md text-gray-200">{displayValue}</p>
        </div>
    )
};

function EventDetailPage({ eventId, user }: { eventId: string, user: firebase.User }) {
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

    const fetchEvent = useCallback(async () => {
      setLoading(true);
      // Fix: Use db.collection().doc().get() from v8 compat syntax
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
            // Fix: Use db.collection().doc().update() from v8 compat syntax
            const eventRef = db.collection('events').doc(event.id);
            await eventRef.update({ status: newStatus });
            setEvent(prev => prev ? {...prev, status: newStatus} : null);
        }
    };
    
    if (loading) return <div>Carregando evento...</div>;
    if (!event) return <div>Evento não encontrado. <a href="#/dashboard">Voltar</a></div>;

    // Fix: Remove unnecessary type assertion to prevent 'map' on 'unknown' error
    const eventStatusOptions = Object.values(EventStatus).map(s => <option key={s} value={s}>{s}</option>);

    return (
        <div className="space-y-8">
            <div className="p-6 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-3xl font-bold">{event.briefing.eventName}</h2>
                    <div className="flex items-center gap-4">
                        <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${getStatusColor(event.status)}`}>
                            {event.status}
                        </span>
                        <select 
                            value={event.status} 
                            onChange={(e) => handleStatusChange(e.target.value as EventStatus)}
                            className="bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-accent focus:border-accent"
                        >
                            {eventStatusOptions}
                        </select>
                    </div>
                </div>
                <p className="text-gray-400 mt-2">Cliente: {event.briefing.client}</p>
                <p className="text-gray-400">Data do Evento: {formatDate(event.briefing.dataEvento)}</p>
                <p className="text-xs text-gray-500 mt-2">OS criada por {event.creatorEmail} em {formatTimestamp(event.createdAt)}</p>
            </div>

            <div className="p-6 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                    <h3 className="text-2xl font-semibold">Briefing (Pré-evento)</h3>
                    <button onClick={() => setIsBriefingModalOpen(true)} className="bg-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">Editar Briefing</button>
                </div>
                 
                {Object.values(briefingSections).map(section => (
                    <div key={section.title}>
                        <h4 className="text-lg font-semibold mt-4 text-accent">{section.title}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6">
                            {section.fields.map(field => (
                                <DetailItem 
                                    key={field.name}
                                    label={field.label}
                                    value={event.briefing[field.name as keyof Briefing]}
                                    isDate={field.type === 'date' || field.type === 'datetime-local'}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-gray-800 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Debriefing (Pós-evento)</h3>
                 {event.debriefing ? (
                    <p>Debriefing preenchido.</p>
                ) : (
                    <p>Nenhum debriefing preenchido ainda.</p>
                )}
                <button className="mt-4 bg-secondary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                    {event.debriefing ? 'Ver/Editar Debriefing' : 'Criar Debriefing'}
                </button>
            </div>

             <div className="p-6 bg-gray-800 rounded-lg">
                <h3 className="text-2xl font-semibold mb-4 border-b border-gray-700 pb-2">Financeiro</h3>
                <button className="mt-4 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded">
                    Gestão de Cachês e Reembolsos
                </button>
            </div>

            <EventFormModal
                isOpen={isBriefingModalOpen}
                onClose={() => setIsBriefingModalOpen(false)}
                onSave={fetchEvent}
                eventData={event}
            />
        </div>
    );
}

function ManagementTable<T extends {id: string}>({ title, data, columns, onAdd, onEdit, onDelete, loading, error }: {
    title: string;
    data: T[];
    columns: { key: keyof T, header: string }[];
    onAdd: () => void;
    onEdit: (item: T) => void;
    onDelete: (id: string) => Promise<void>;
    loading: boolean;
    error: string | null;
}) {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">{title}</h2>
                <button onClick={onAdd} className="bg-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg flex items-center transition duration-300">
                    <PlusIcon /> Adicionar Novo
                </button>
            </div>
             {error && <div className="bg-error/20 text-error p-4 rounded-lg mb-6">{error}</div>}
            <div className="bg-gray-800 rounded-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-700">
                        <tr>
                            {columns.map(col => <th key={String(col.key)} className="p-4 font-semibold">{col.header}</th>)}
                            <th className="p-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                             <tr>
                                <td colSpan={columns.length + 1} className="text-center p-8">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                                        <span className="ml-4 text-gray-300">Carregando...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length > 0 ? (
                            data.map(item => (
                                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                    {columns.map(col => <td key={String(col.key)} className="p-4">{(item[col.key] as any) || 'N/A'}</td>)}
                                    <td className="p-4 text-right">
                                        <button onClick={() => onEdit(item)} className="text-yellow-400 hover:text-yellow-300 mr-4">Editar</button>
                                        <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-400">Excluir</button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center p-8 text-gray-400">
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

function CollaboratorsPage() {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Collaborator | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    
    const handleDelete = async (id: string) => {
        if(window.confirm("Tem certeza que deseja excluir este colaborador?")) {
            // Fix: Use db.collection().doc().delete() from v8 compat syntax
            await db.collection("collaborators").doc(id).delete();
            fetchCollaborators();
        }
    }

    return (
        <>
            <ManagementTable<Collaborator>
                title="Gerenciar Colaboradores"
                data={collaborators}
                columns={[
                    { key: 'nome', header: 'Nome' },
                    { key: 'categoria', header: 'Categoria' },
                    { key: 'cargo', header: 'Cargo' },
                    { key: 'telefone', header: 'Telefone' },
                ]}
                onAdd={() => { setEditing(null); setIsModalOpen(true); }}
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
        </>
    );
}

function CollaboratorFormModal({isOpen, onClose, onSave, collaborator}: {isOpen: boolean, onClose: () => void, onSave: (data: Partial<Collaborator>) => void, collaborator: Collaborator | null}) {
    const [formData, setFormData] = useState<Partial<Collaborator>>({});
    useEffect(() => {
        setFormData(collaborator || { categoria: CollaboratorCategory.Freelancer });
    }, [collaborator, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const categoryOptions = (Object.values(CollaboratorCategory) as string[]).map(c => ({value: c, label: c}));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={collaborator ? "Editar Colaborador" : "Adicionar Colaborador"}>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <FormField label="Nome Completo" name="nome" value={formData.nome || ''} onChange={handleChange} required/>
                <FormField as="select" label="Categoria" name="categoria" value={formData.categoria || ''} onChange={handleChange} options={categoryOptions} />
                <FormField label="Apelido" name="apelido" value={formData.apelido || ''} onChange={handleChange} />
                <FormField label="Cargo" name="cargo" value={formData.cargo || ''} onChange={handleChange} />
                <FormField label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
                <FormField label="Telefone" name="telefone" value={formData.telefone || ''} onChange={handleChange} />
                <FormField label="CPF" name="cpf" value={formData.cpf || ''} onChange={handleChange} />
                <FormField label="RG" name="rg" value={formData.rg || ''} onChange={handleChange} />
                 <div className="md:col-span-2 mt-4 text-right">
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-600 hover:bg-gray-500 mr-4">Cancelar</button>
                    <button type="submit" className="bg-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">Salvar</button>
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
                    <button type="button" onClick={onClose} className="py-2 px-4 rounded bg-gray-600 hover:bg-gray-500 mr-4">Cancelar</button>
                    <button type="submit" className="bg-accent hover:bg-blue-500 text-white font-bold py-2 px-4 rounded">Salvar</button>
                </div>
            </form>
        </Modal>
    );
}

function CalendarPage() {
    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Calendário de Eventos</h2>
            <div className="bg-gray-800 rounded-lg p-8 text-center">
                <p className="text-gray-400">A visualização do calendário está em desenvolvimento.</p>
                <p className="text-gray-500 mt-2">Os eventos criados aparecerão aqui em breve.</p>
            </div>
        </div>
    );
}
