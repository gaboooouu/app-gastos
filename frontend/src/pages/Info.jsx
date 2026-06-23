import React, { useState, useMemo } from 'react';

const HELP_SECTIONS = [
  {
    id: 'intro',
    title: 'Introducción',
    icon: 'info',
    content: [
      {
        subtitle: 'Filosofía FinVue',
        text: 'FinVue no es solo un registrador de gastos; es un centro de comando financiero. Nuestra metodología se basa en dos pilares: la automatización para eliminar el trabajo tedioso y la planificación consciente para que cada peso tenga un propósito.'
      }
    ]
  },
  {
    id: 'cuentas',
    title: 'Cuentas y Saldos',
    icon: 'account_balance',
    content: [
      {
        subtitle: 'Cuentas Automáticas (Fintoc)',
        text: 'Son cuentas vinculadas directamente a tu banco. FinVue se conecta de forma segura para leer tu saldo real y descargar tus movimientos cada vez que abres la app. No necesitas mover un dedo para mantenerlas al día. "Los saldos se actualizan en ciertas horas del día, no en tiempo real, al igual que las transacciones automáticas"'
      },
      {
        subtitle: 'Cuentas Manuales (Flexibles)',
        text: 'Diseñadas para todo lo que no está en el banco: efectivo en tu billetera, ahorros físicos o cuentas en instituciones no soportadas. A diferencia de las automáticas, tú tienes el control total para ajustar el saldo manualmente según sea necesario.'
      },
      {
        subtitle: 'Saldo Global',
        text: 'Es la suma inteligente de todas tus fuentes de dinero. Te da una visión "Big Picture" de tu patrimonio líquido en un solo lugar.'
      }
    ]
  },
  {
    id: 'transacciones',
    title: 'Transacciones y Movimientos',
    icon: 'receipt_long',
    content: [
      {
        subtitle: 'Movimientos Automáticos',
        text: 'Vienen directo de tu banco. Por seguridad e integridad de los datos, su monto está "bloqueado" (no se pueden alterar), pero puedes personalizar completamente su descripción, categoría y fecha (ya que a veces el banco no registra la fecha correcta) si asi lo deseas. Esta edición no afecta tus datos bancarios, solo la forma en que se muestran en la app.'
      },
      {
        subtitle: 'Movimientos Manuales (Creación Libre)',
        text: 'Ideales para gastos en efectivo, préstamos a amigos o cualquier flujo de dinero fuera del sistema bancario. Estos movimientos son 100% editables: puedes cambiar el monto, la fecha, la cuenta de origen y la categoría en cualquier momento.'
      },
      {
        subtitle: 'Poder de Edición',
        text: 'En cualquier transacción puedes cambiar el nombre que viene del banco y, lo más importante, dividirla si el gasto corresponde a múltiples propósitos. Además puedes elegir en que mes de presupuesto quieres que se refleje el movimiento. Por ejemplo, si pagas el arriendo de Febrero a finales de Enero, puedes elegir que se refleje en el presupuesto de Febrero.'
      },
      {
        subtitle: 'Neteo de gastos',
        text: 'Si tienes gastos que se anulan o restan entre sí, como un reembolso o una devolución, puedes "netearlos" para que no afecten tu presupuesto, esto se efectua cuando el gasto e ingreso tienen la misma categoría. Por ejemplo, si compraste algo de $10.000 y luego recibes un reembolso de $10.000 por esa compra, puedes netearlo para que no se considere como un ingreso extra, asignandoles la misma categoría a ambos movimientos. De esta forma el gasto se anula y no afecta tu presupuesto. O por ejemplo, si vas a comer con amigos y tu pagas el total de la cuenta, luego tus amigos te transfieren el dinero que te deben, puedes netearlo para que no se considere como un ingreso extra, asignandoles la misma categoría a ambos movimientos. De esta forma el gasto se resta.'
      },
      {
        subtitle: 'Dividir Movimientos (Split)',
        text: 'Esta función te permite desglosar una única compra en varios ítems. Por ejemplo, si pagaste $50.000 en el supermercado, puedes dividir $40.000 para "Alimentación" y $10.000 para "Artículos de Aseo". Cada parte se verá reflejada de forma independiente en tu presupuesto (siempre y cuando hayas elegido una palabra clave en los items del presupuesto).'
      }
    ]
  },
  {
    id: 'presupuesto',
    title: 'Presupuesto Maestro',
    icon: 'calendar_today',
    content: [
      {
        subtitle: 'ADN del Ítem (Grupos, Categorías y Palabras Clave)',
        text: 'Cada ítem de presupuesto tiene su propio "ADN". Cada ítem pertenece a un grupo, esto te permite organizar tus gastos de forma lógica y coherente. Además puedes configurar los items para que sumen automáticamente gastos basados en categorías específicas o mediante palabras clave. Si le asignas una categoría, se sumarán todos los movimientos con esa categoría al gasto real. O si pones "STARBUCKS", por ejemplo, como palabra clave, solo se sumarán de forma automatica los movimientos que tengan esa palabra clave en su descripción.'
      },
      {
        subtitle: 'Automatización del Estado de Pago',
        text: '¡Olvida marcar manual! FinVue es inteligente: cuando el gasto real de un ítem iguala o supera el monto estimado, la app lo marca automáticamente como "Pagado" y lo resalta en verde. Esto te da una confirmación visual inmediata de tus obligaciones cumplidas.'
      },
      {
        subtitle: 'Importar Estructura',
        text: 'Al comenzar un nuevo mes, usa la función "Importar del mes anterior". Esto arrastra todos tus grupos, conceptos, palabras clave y categorías vinculadas, permitiéndote planificar tu mes en menos de 10 segundos.'
      },
      {
        subtitle: 'Evolución y Gráficos',
        text: 'El icono de monitoreo te muestra la historia clínica de cada gasto. Puedes ver si el precio de tu plan de internet ha subido en el último semestre o si estás gastando más en restaurante que en meses anteriores, esto solo funciona si los items son iguales mes a mes, deben coincidir en nombre, grupo, categoría y palabras clave. La forma más fácil de asegurar que se cumplan estas condiciones es usar el botón "Importar del mes anterior" cuando empieces un nuevo mes. Así, la app duplica exactamente el Concepto, el Grupo y el ADN (filtros) del ítem, garantizando que el gráfico de evolución sea una línea continua y perfecta.'
      },
      {
        subtitle: 'Notas',
        text: 'En el presupuesto puedes agregar notas para recordar detalles importantes sobre cada ítem. Por ejemplo, puedes anotar "Este gasto costó más porque subió el dólar" o "Este gasto fue menor porque aproveché una oferta".'
      }
    ]
  },
  {
    id: 'faq',
    title: 'Preguntas Frecuentes',
    icon: 'quiz',
    content: [
      {
        subtitle: 'Si recibo un único pago pero en el presupuesto lo divido en varios items, ¿qué hago?',
        text: 'Es el escenario perfecto para la función "Dividir". Ve a Transacciones, busca el pago y usa el botón de desglose. Divide el monto total en las partes que necesites y asígnale a cada parte el ítem de presupuesto correcto. El sistema detectará automáticamente cada trozo y los sumará a los ítems correspondientes.'
      },
      {
        subtitle: '¿Cuándo debería crear un movimiento manual?',
        text: 'Cuando pagues algo con billetes físicos, cuando alguien te pague una deuda en mano, o cuando quieras proyectar un gasto que aún no aparece en tu banco pero ya realizaste.'
      },
      {
        subtitle: '¿Qué significa el estado en Naranjo en el presupuesto?',
        text: 'Significa "Sobre-estimado" o Exceso de Gasto. Aparece cuando tu gasto real ha superado considerablemente lo que habías planificado, invitándote a revisar tus hábitos en esa categoría específica.'
      }
    ]
  }
];

export default function Info() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('intro');

  const filteredSections = useMemo(() => {
    if (!searchTerm) return HELP_SECTIONS;
    const lowerSearch = searchTerm.toLowerCase();
    return HELP_SECTIONS.map(section => ({
      ...section,
      content: section.content.filter(item => 
        item.subtitle.toLowerCase().includes(lowerSearch) || 
        item.text.toLowerCase().includes(lowerSearch) ||
        section.title.toLowerCase().includes(lowerSearch)
      )
    })).filter(section => section.content.length > 0);
  }, [searchTerm]);

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      
      {/* Sidebar de Navegación (Index) */}
      <aside className="lg:w-64 shrink-0 flex flex-col gap-6">
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white shadow-xl lg:sticky lg:top-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-1">Índice</h3>
          <nav className="flex flex-col gap-1">
            {HELP_SECTIONS.map(section => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all text-left ${
                  activeSection === section.id 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold scale-105' 
                    : 'text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{section.icon}</span>
                <span className="text-xs">{section.title}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col gap-8 pb-10">
        
        {/* Buscador */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input
            type="text"
            placeholder="¿Qué necesitas saber? Ejemplo: Palabras clave, dividir gasto..."
            className="neu-input w-full pl-16 pr-6 py-5 rounded-[2.5rem] text-slate-700 font-bold outline-none border border-transparent focus:border-primary/20 transition-all bg-[#F0F2F5]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Listado de Secciones */}
        <div className="flex flex-col gap-12">
          {filteredSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-inner">
                  <span className="material-symbols-outlined text-2xl">{section.icon}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{section.title}</h2>
              </div>

              <div className="grid gap-4">
                {section.content.map((item, idx) => (
                  <div key={idx} className="bg-white/40 backdrop-blur-md p-8 rounded-[2rem] border border-white hover:bg-white/70 transition-all group shadow-sm">
                    <h4 className="text-sm font-black text-primary-dark mb-3 uppercase tracking-wider group-hover:text-primary transition-colors">
                      {item.subtitle}
                    </h4>
                    <p className="text-slate-600 font-medium leading-relaxed text-sm">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-20 flex flex-col items-center gap-4 opacity-50">
              <span className="material-symbols-outlined text-6xl">search_off</span>
              <p className="font-bold text-slate-500 uppercase tracking-widest text-[10px]">No encontramos nada para "{searchTerm}"</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="text-primary font-black text-xs hover:underline mt-2"
              >
                Ver todo el manual
              </button>
            </div>
          )}
        </div>

        {/* Banner IA Preparación */}
        {!searchTerm && (
          <div className="mt-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
            <div className="relative z-10 max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <span className="material-symbols-outlined text-white">auto_awesome</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Próximamente</span>
              </div>
              <h3 className="text-2xl font-black mb-3">FinVue Intelligence</h3>
              <p className="text-indigo-50 leading-relaxed text-sm font-medium">
                Estamos entrenando a una Inteligencia Artificial con toda esta información para que pronto puedas resolver cualquier duda a través de un chat en tiempo real.
              </p>
            </div>
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <span className="material-symbols-outlined text-[200px] rotate-12">smart_toy</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
