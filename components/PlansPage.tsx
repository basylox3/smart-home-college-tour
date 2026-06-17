import Link from "next/link";
import { InteractiveShell } from "./InteractiveShell";

type CampusZone = {
  title: string;
  text: string;
};

type FloorSheet = {
  title: string;
  src: string;
  alt: string;
  caption: string;
};

type FloorPlan = {
  id: "1" | "2" | "3" | "4";
  title: string;
  summary: string;
  mainSpaces: string[];
  supportSpaces: string[];
};

const campusZones: CampusZone[] = [
  {
    title: "Спортивное ядро",
    text: "Слева вынесен стадион с беговыми дорожками, футбольным полем, трибунами и служебными помещениями.",
  },
  {
    title: "Главный корпус",
    text: "Центральный объем повторяет форму основного корпуса и связывает входную площадь с учебными крыльями.",
  },
  {
    title: "Площадь и сцена",
    text: "Перед входом сохранено открытое пространство для сборов, мероприятий, посадочных зон и общей навигации.",
  },
  {
    title: "Парковка и маршруты",
    text: "Справа собран парковочный блок, а по периметру проходят дорожки, озеленение и буферные зоны.",
  },
];

const floorSheets: FloorSheet[] = [
  {
    title: "1 и 2 этаж",
    src: "/plans/floor-plan-1-2.jpg",
    alt: "План колледжа: первый и второй этаж",
    caption: "Учебные, прикладные и сервисные пространства первых двух этажей.",
  },
  {
    title: "3 и 4 этаж",
    src: "/plans/floor-plan-3-4.jpg",
    alt: "План колледжа: третий и четвертый этаж",
    caption: "Общественные, IT и административные пространства верхних этажей.",
  },
];

const floorPlans: FloorPlan[] = [
  {
    id: "1",
    title: "1 этаж",
    summary: "Базовый технический и сервисный уровень: лаборатории, мастерские, гардероб и медблок.",
    mainSpaces: [
      "Электромонтаж, радиомонтаж и телекоммуникационные лаборатории",
      "Швейная мастерская, проектирование и теория швейного дела",
      "Учебная лаборатория техника-электрика и общая теория электро/радио",
    ],
    supportSpaces: [
      "Гардероб, медкабинеты и кабинеты преподавателей",
      "Склады, подготовка материалов и техпомещения",
      "Лифты, лестницы и санитарные блоки для персонала и студентов",
    ],
  },
  {
    id: "2",
    title: "2 этаж",
    summary: "Практический учебный этаж с лекционными аудиториями, студиями и прикладными мастерскими.",
    mainSpaces: [
      "Лекционные аудитории по двум крыльям корпуса",
      "Студии графики и интерьера, ПК-кабинеты",
      "Мастерские модельеров и парикмахеров, столовая и кухня",
    ],
    supportSpaces: [
      "Кабинет психолога и обычные кабинеты сопровождения",
      "Хозпомещения, санитарные блоки, лестницы и лифты",
      "Технические карманы и проходные зоны для потока студентов",
    ],
  },
  {
    id: "3",
    title: "3 этаж",
    summary: "Общественный этаж для событий и гуманитарных направлений: актовый зал, библиотека и имитационные помещения.",
    mainSpaces: [
      "Крупный актовый зал в центральной части маршрута",
      "Библиотека, помещение-имитация гостиницы и судебной среды",
      "Юридические аудитории, лингафонные кабинеты и администрация блока",
    ],
    supportSpaces: [
      "Склад техники и подсобные комнаты для мероприятий",
      "Лифты, лестницы и пожарные выходы по ядрам",
      "Санитарные и технические помещения вдоль торцевых участков",
    ],
  },
  {
    id: "4",
    title: "4 этаж",
    summary: "Верхний этаж под IT-направление и управление: большие лаборатории, серверная и административные кабинеты.",
    mainSpaces: [
      "Большие IT-лабы, компьютерные классы и кабинеты разработчиков",
      "Серверная, дополнительные компьютерные классы поменьше",
      "Директор, администрация, бухгалтерия и конференц-залы",
    ],
    supportSpaces: [
      "Преподавательские и зона тихого отдыха в коридоре",
      "Технические помещения, лифты, лестницы и пожарные выходы",
      "Санитарные блоки и лингафонные кабинеты",
    ],
  },
];

export function PlansPage() {
  return (
    <>
      <InteractiveShell />
      <a className="skip-link" href="#plans-content">
        Перейти к содержимому
      </a>
      <main className="page-shell plans-page" id="plans-content">
        <header className="site-header">
          <Link className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">
              <img src="/college-logo.svg" alt="" />
            </span>
            <span className="brand-text">Перспективный колледж</span>
          </Link>

          <button className="nav-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="site-nav">
            <span />
            <span />
          </button>

          <nav className="site-nav game-nav" id="site-nav">
            <div className="site-nav__main">
              <Link href="/">Главная</Link>
              <Link href="/#tour">3D тур</Link>
              <Link href="/plans" aria-current="page">
                Планы
              </Link>
            </div>
            <div className="site-nav__utility" aria-label="Дополнительные разделы">
              <Link href="/game">Игра</Link>
              <Link href="/admin">Админ</Link>
            </div>
          </nav>
        </header>

        <section className="section plans-hero reveal is-visible">
          <div className="section-head plans-headline">
            <p className="eyebrow">Отдельная вкладка</p>
            <h1>План колледжа и план макета собраны в одной понятной странице</h1>
            <p>
              Здесь вынесены реальные изображения генплана и этажей, чтобы можно было быстро
              ориентироваться по территории и внутренней структуре корпуса.
            </p>
          </div>

          <div className="plans-jump-links">
            <a className="button magnet" href="#campus-plan">
              План колледжа
            </a>
            <a className="button button-ghost magnet" href="#layout-plan">
              План макета
            </a>
          </div>
        </section>

        <section className="section plan-section" id="campus-plan">
          <div className="plans-layout reveal">
            <figure className="plan-visual" data-tilt>
              <img src="/plans/campus-plan.jpg" alt="Генплан территории Перспективного колледжа" loading="lazy" />
            </figure>

            <aside className="plan-details">
              <div>
                <p className="eyebrow">Генплан</p>
                <h2>Территория колледжа показана в реальном макете</h2>
                <p>
                  В этом блоке собраны основные зоны территории: спортивное ядро, главный корпус,
                  входная площадь, парковка и открытые участки для общего движения и событий.
                </p>
              </div>

              <div className="plan-summary-grid" aria-label="Основные зоны колледжа">
                {campusZones.map((zone) => (
                  <article className="plan-summary-card kinetic-item" key={zone.title}>
                    <span>Зона</span>
                    <h3>{zone.title}</h3>
                    <p>{zone.text}</p>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className="section plan-section" id="layout-plan">
          <div className="section-head reveal">
            <p className="eyebrow">План макета</p>
            <h2>Поэтажная схема теперь показана на реальных листах макета</h2>
            <p>
              Ниже размещены исходные изображения с этажами, а затем краткая расшифровка по каждому
              уровню, чтобы посетителю было проще считать структуру корпуса.
            </p>
          </div>

          <div className="layout-sheet-grid reveal">
            {floorSheets.map((sheet) => (
              <figure className="layout-sheet-card kinetic-item" data-tilt key={sheet.title}>
                <img src={sheet.src} alt={sheet.alt} loading="lazy" />
                <figcaption>
                  <strong>{sheet.title}</strong>
                  <span>{sheet.caption}</span>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="floor-grid">
            {floorPlans.map((floor) => (
              <article className="floor-card reveal kinetic-item" data-tilt key={floor.id}>
                <div className="floor-card__top">
                  <div className="floor-card__title">
                    <span className="floor-card__label">Этаж {floor.id}</span>
                    <strong>{floor.title}</strong>
                    <p>{floor.summary}</p>
                  </div>
                </div>

                <p className="floor-card__focus">Основной акцент: {floor.mainSpaces[0]}</p>

                <div className="floor-card__lists">
                  <section className="floor-card__list">
                    <h3>Главные пространства</h3>
                    <ul>
                      {floor.mainSpaces.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="floor-card__list">
                    <h3>Поддерживающие зоны</h3>
                    <ul>
                      {floor.supportSpaces.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
