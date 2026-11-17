import manifest from './image-manifest.json'
import type { Fact, ImageAsset, Localized, Panel, Project } from './types'

// ---------------------------------------------------------------- helpers
const L = (en: string, fa: string): Localized<string> => ({ en, fa })
const LL = (en: string[], fa: string[]): Localized<string[]> => ({ en, fa })

type ManifestEntry = { src: string; width: number; height: number; blurDataURL: string; tone: string }
const entries = manifest as Record<string, ManifestEntry>

export function img(key: string, alt: Localized<string>): ImageAsset {
  const entry = entries[key]
  if (!entry) throw new Error(`Image "${key}" is missing from image-manifest.json — run "npm run images".`)
  return { key, alt, ...entry }
}

const fact = (label: Localized<string>, value: Localized<string>): Fact => ({ label, value })

const credits = (...groups: [Localized<string>, Localized<string[]>][]): Panel => ({
  type: 'credits',
  groups: groups.map(([role, names]) => ({ role, names })),
})

const ROLE = {
  lead: L('Design lead', 'مدیر طراحی'),
  team: L('Project team', 'تیم پروژه'),
  collab: L('Collaborators', 'همکاران'),
  structure: L('Structure', 'سازه'),
  landscape: L('Landscape', 'منظر'),
  light: L('Lighting', 'نورپردازی'),
}

// ---------------------------------------------------------------- projects
const meridianHero = img('meridian-pavilion/hero', L('Six vaulted halls of the Meridian Pavilion reflected in a still pool at dawn', 'شش تالار قوسی پاویون نصف‌النهار که در سپیده‌دم در آبگینه‌ای آرام بازتاب یافته‌اند'))
const tehranHero = img('tehran-terraces/hero', L('Tehran Terraces, six stepped levels planted with trees against the Alborz foothills', 'تراس‌های تهران، شش طبقه پلکانی با درختکاری در دامنه البرز'))
const caspianHero = img('caspian-reading-house/hero', L('Aerial view of the Caspian Reading House ringed around a water court', 'نمای هوایی خانه مطالعه خزر که دور حیاطی آبی حلقه زده است'))
const zagrosHero = img('zagros-lodge/hero', L('Zagros Lodge: stone volumes catching low sun in the mountains', 'اقامتگاه زاگرس: حجم‌های سنگی در نور کم‌ارتفاع کوهستان'))
const hormuzHero = img('hormuz-shore-walk/hero', L('The Hormuz Shore Walk, a long timber promenade raised above the water', 'پیاده‌راه ساحلی هرمز، گذرگاهی چوبی و بلند بر فراز آب'))
const spineHero = img('green-spine-masterplan/hero', L('Aerial masterplan of the Green Spine, courtyards arranged around a central basin', 'نمای هوایی طرح جامع ستون فقرات سبز؛ حیاط‌هایی گرد یک حوضچه مرکزی'))
const naqshHero = img('naqsh-atelier-interior/hero', L('Three arched openings glowing in the Naqsh Atelier gallery', 'سه دهانه قوسی درخشان در گالری آتلیه نقش'))
const kavirHero = img('kavir-observatory/hero', L('The Kavir Observatory dome above the desert dunes', 'گنبد رصدخانه کویر بر فراز تپه‌های ماسه‌ای'))

export const projects: Project[] = [
  // 1 ------------------------------------------------------------------
  {
    id: 'p-01',
    slug: 'meridian-pavilion',
    category: 'architecture',
    typology: 'culture',
    status: 'construction',
    year: 2025,
    area: 4800,
    title: L('Meridian Pavilion', 'پاویون نصف‌النهار'),
    location: L('Isfahan, Iran', 'اصفهان، ایران'),
    client: L('Isfahan Municipality Cultural Organisation', 'سازمان فرهنگی شهرداری اصفهان'),
    shortDescription: L('Six vaulted halls that frame the Zayandeh River at dawn.', 'شش تالار قوسی که زاینده‌رود را در سپیده‌دم قاب می‌گیرند.'),
    description: LL(
      ['The Meridian Pavilion lines up six vaulted halls along the line of the old Isfahan meridian, so that each hall opens to the river at a slightly different angle of morning light.', 'The halls are cast in lime-pigmented concrete and share a single shallow pool, which doubles the arcade in water and cools the air before it enters the building.'],
      ['پاویون نصف‌النهار شش تالار قوسی را در امتداد نصف‌النهار قدیمی اصفهان به‌ردیف می‌کند تا هر تالار با زاویه‌ای اندکی متفاوت از نور صبح، رو به رود باز شود.', 'تالارها از بتن رنگ‌دانه‌دار با آهک ساخته شده‌اند و حوضچه‌ای کم‌عمق مشترک دارند که آرکید را در آب دوچندان می‌کند و هوا را پیش از ورود به ساختمان خنک می‌سازد.'],
    ),
    thumbnail: meridianHero,
    hero: meridianHero,
    facts: [
      fact(L('Structure', 'سازه'), L('Cast concrete vaults, 14 m span', 'طاق‌های بتنی با دهانه ۱۴ متر')),
      fact(L('Certification', 'گواهی'), L('LEED Gold (target)', 'LEED Gold (هدف)')),
      fact(L('Collaborator', 'همکار'), L('Atelier Nord, Oslo', 'Atelier Nord، اسلو')),
    ],
    panels: [
      { type: 'intro', heading: L('A hall for every hour', 'برای هر ساعت یک تالار'), body: LL(['Each vault is oriented a few degrees from its neighbour. As the sun climbs, the glow moves from the first hall to the last, turning the pavilion into a slow instrument for telling time.', 'Programme: a 600-seat hall, three exhibition rooms, a reading garden and a café at the river edge.'], ['هر طاق چند درجه با همسایه‌اش اختلاف جهت دارد. با بالا آمدن خورشید، درخشش از نخستین تالار به آخرین تالار می‌رود و پاویون را به ساعتی آهسته بدل می‌کند.', 'برنامه فضایی: تالار ۶۰۰ نفره، سه فضای نمایشگاهی، باغ مطالعه و یک کافه در لبه رود.']) },
      { type: 'image', image: img('meridian-pavilion/arcade', L('The arcade seen from the pool edge', 'آرکید از لبه حوضچه')), shape: 'landscape', caption: L('The arcade from the pool edge, late morning.', 'آرکید از لبه حوضچه، نزدیک ظهر.') },
      { type: 'quote', text: L('“We wanted the building to arrive slowly, the way light arrives at a courtyard.”', '«می‌خواستیم ساختمان آرام برسد؛ همان‌طور که نور به حیاط می‌رسد.»'), attribution: L('Neda Karimi, design lead', 'ندا کریمی، مدیر طراحی') },
      { type: 'image', image: img('meridian-pavilion/interior', L('Interior of the main hall with three arched openings', 'فضای داخلی تالار اصلی با سه دهانه قوسی')), shape: 'portrait', caption: L('Main hall: three arched openings frame the river.', 'تالار اصلی: سه دهانه قوسی، رود را قاب می‌گیرند.') },
      { type: 'context', heading: L('Site', 'زمین'), body: L('The plot sits 300 m north-west of Si-o-se-pol, where the river widens. Foot traffic from the old bridge enters at the third hall.', 'زمین ۳۰۰ متر شمال‌غربی سی‌وسه‌پل، جایی که رود پهن‌تر می‌شود، قرار دارد. عابران پل قدیمی از تالار سوم وارد می‌شوند.'), coordinates: '32.6366° N, 51.6676° E' },
      { type: 'imagePair', images: [img('meridian-pavilion/facade', L('Terracotta fins of the south facade', 'پره‌های سفالی نمای جنوبی')), img('meridian-pavilion/plan', L('Ground plan drawing', 'نقشه همکف'))], captions: [L('South facade: terracotta fins, 40 mm apart.', 'نمای جنوبی: پره‌های سفالی با فاصله ۴۰ میلی‌متر.'), L('Ground plan, 1:250.', 'نقشه همکف، ۱:۲۵۰.')] },
      { type: 'diagram', image: img('meridian-pavilion/section', L('Longitudinal section drawing', 'برش طولی')), caption: L('Longitudinal section: the roofs step down toward the river.', 'برش طولی: بام‌ها به‌سوی رود پایین می‌آیند.') },
      { type: 'facts', heading: L('At a glance', 'در یک نگاه'), items: [fact(L('Halls', 'تالارها'), L('6', '۶')), fact(L('Span', 'دهانه'), L('14 m', '۱۴ متر')), fact(L('Pool', 'حوضچه'), L('1,200 m²', '۱٬۲۰۰ متر مربع')), fact(L('Energy', 'انرژی'), L('−38% vs. baseline', '۳۸٪ کمتر از مبنا'))] },
      credits([ROLE.lead, LL(['Neda Karimi'], ['ندا کریمی'])], [ROLE.team, LL(['Arman Rahimi', 'Sara Moradi', 'Kian Heydari'], ['آرمان رحیمی', 'سارا مرادی', 'کیان حیدری'])], [ROLE.collab, LL(['Atelier Nord', 'Lund & Partners'], ['Atelier Nord', 'Lund & Partners'])]),
      { type: 'related', slugs: ['naqsh-atelier-interior', 'caspian-reading-house', 'kavir-observatory'] },
    ],
    related: ['naqsh-atelier-interior', 'caspian-reading-house', 'kavir-observatory'],
  },
  // 2 ------------------------------------------------------------------
  {
    id: 'p-02',
    slug: 'tehran-terraces',
    category: 'architecture',
    typology: 'residential',
    status: 'completed',
    year: 2024,
    area: 12400,
    title: L('Tehran Terraces', 'تراس‌های تهران'),
    location: L('Tehran, Iran', 'تهران، ایران'),
    client: L('Alborz Development Co.', 'شرکت توسعه البرز'),
    shortDescription: L('Sixty homes stacked as planted terraces facing the Alborz.', 'شصت خانه که به‌شکل تراس‌های سبز رو به البرز روی هم نشسته‌اند.'),
    description: LL(
      ['Tehran Terraces turns a steep north-facing plot into sixty apartments, each with a private garden terrace as large as its living room.', 'The stepped section lets every home look over the roof of the one below, and keeps the street edge at the scale of the neighbouring houses.'],
      ['تراس‌های تهران یک زمین پرشیب رو به شمال را به شصت آپارتمان بدل می‌کند؛ هر کدام با تراس باغی خصوصی هم‌اندازه اتاق نشیمن.', 'مقطع پلکانی هر خانه را به بام خانه زیرین مشرف می‌کند و لبه خیابان را در مقیاس خانه‌های همسایه نگه می‌دارد.'],
    ),
    thumbnail: tehranHero,
    hero: tehranHero,
    facts: [
      fact(L('Structure', 'سازه'), L('RC frame, post-tensioned slabs', 'قاب بتنی، دال پس‌کشیده')),
      fact(L('Homes', 'واحدها'), L('60', '۶۰')),
      fact(L('Planting', 'کاشت'), L('2,300 trees and shrubs', '۲٬۳۰۰ درخت و درختچه')),
    ],
    panels: [
      { type: 'intro', body: LL(['Every terrace is a garden: planters are cast into the slab edge, irrigated from the building’s grey-water system.', 'From the street the building reads as a hill; from the terraces it reads as a village.'], ['هر تراس یک باغ است: گلدان‌ها در لبه دال ریخته شده‌اند و از سامانه آب خاکستری ساختمان آبیاری می‌شوند.', 'از خیابان، ساختمان مانند تپه‌ای دیده می‌شود؛ از تراس‌ها مانند یک روستا.']) },
      { type: 'image', image: img('tehran-terraces/garden', L('Garden terraces in a wide view', 'تراس‌های باغی در نمایی عریض')), shape: 'wide', caption: L('Planted terraces catch the afternoon light.', 'تراس‌های سبز نور بعدازظهر را می‌گیرند.') },
      { type: 'quote', text: L('“The terrace is the room we never had in the apartment block.”', '«تراس همان اتاقی است که در آپارتمان‌های معمولی نداشتیم.»'), attribution: L('Resident, third floor', 'ساکن طبقه سوم') },
      { type: 'image', image: img('tehran-terraces/detail', L('Detail of the timber screen', 'جزئیات پرده چوبی')), shape: 'portrait', caption: L('Screens of thermally modified ash, 12 mm slats.', 'پرده‌هایی از چوب زبان‌گنجشک عمل‌آوری حرارتی، با تیغه‌های ۱۲ میلی‌متری.') },
      { type: 'image', image: img('tehran-terraces/interior', L('Living room opening onto the terrace', 'اتاق نشیمن باز به تراس')), shape: 'landscape', caption: L('A living room opens onto its own garden.', 'نشیمن، رو به باغ خصوصی خود باز می‌شود.') },
      { type: 'diagram', image: img('tehran-terraces/section', L('Section through the stepped terraces', 'برش از میان تراس‌های پلکانی')), caption: L('Section A-A: each level is set back 3.6 m.', 'برش A-A: هر طبقه ۳٫۶ متر عقب‌نشینی دارد.') },
      { type: 'context', heading: L('Neighbourhood', 'محله'), body: L('The site is on the slopes of Darabad, 1,650 m above sea level. Views run north to Mount Tochal.', 'زمین در دامنه‌های دارآباد و ۱٬۶۵۰ متر بالاتر از سطح دریا قرار دارد. دید به سمت شمال و قله توچال است.'), coordinates: '35.7790° N, 51.5210° E' },
      credits([ROLE.lead, LL(['Arman Rahimi'], ['آرمان رحیمی'])], [ROLE.team, LL(['Neda Karimi', 'Mina Sadeghi', 'Omid Tavakoli'], ['ندا کریمی', 'مینا صادقی', 'امید توکلی'])], [ROLE.landscape, LL(['Green Atelier', 'Studio Hanne Berg'], ['آتلیه سبز', 'Studio Hanne Berg'])]),
      { type: 'related', slugs: ['green-spine-masterplan', 'zagros-lodge', 'meridian-pavilion'] },
    ],
    related: ['green-spine-masterplan', 'zagros-lodge', 'meridian-pavilion'],
  },
  // 3 ------------------------------------------------------------------
  {
    id: 'p-03',
    slug: 'caspian-reading-house',
    category: 'architecture',
    typology: 'culture',
    status: 'design',
    year: 2025,
    area: 3200,
    title: L('Caspian Reading House', 'خانه مطالعه خزر'),
    location: L('Rasht, Iran', 'رشت، ایران'),
    client: L('Gilan Library Foundation', 'بنیاد کتابخانه‌های گیلان'),
    shortDescription: L('A public library arranged around a rain-fed water court.', 'کتابخانه‌ای عمومی گرد حیاطی آبی که از باران تغذیه می‌شود.'),
    description: LL(
      ['The Reading House is a ring of twelve small pavilions around a rain-fed water court. Each pavilion holds one reading room with a single large window to the court.', 'Rasht’s wet climate becomes the building’s main material: rainwater is collected, slowed and displayed rather than hidden.'],
      ['خانه مطالعه حلقه‌ای از دوازده پاویون کوچک گرد یک حیاط آبی است که از باران تغذیه می‌شود. هر پاویون یک اتاق مطالعه با پنجره‌ای بزرگ به حیاط دارد.', 'اقلیم مرطوب رشت به مصالح اصلی ساختمان بدل می‌شود: آب باران جمع می‌شود، آرام می‌گیرد و به نمایش در می‌آید.'],
    ),
    thumbnail: caspianHero,
    hero: caspianHero,
    facts: [
      fact(L('Collection', 'مجموعه'), L('90,000 volumes', '۹۰٬۰۰۰ جلد')),
      fact(L('Roof', 'بام'), L('Green roofs with copper gutters', 'بام سبز با ناودان مسی')),
      fact(L('Structure', 'سازه'), L('CLT and glulam', 'CLT و چوب چندلایه')),
    ],
    panels: [
      { type: 'intro', body: LL(['Twelve pavilions, twelve atmospheres. Each reading room has its own ceiling height, its own timber and its own view of the water.', 'The ring is open on the south, where the garden meets the city street.'], ['دوازده پاویون، دوازده فضا. هر اتاق مطالعه ارتفاع سقف، چوب و منظره آب مخصوص خود را دارد.', 'حلقه از جنوب باز است؛ جایی که باغ به خیابان شهر می‌رسد.']) },
      { type: 'image', image: img('caspian-reading-house/court', L('The water court seen from above', 'حیاط آبی از بالا')), shape: 'landscape', caption: L('The water court, seen from the roof garden.', 'حیاط آبی، از باغ بام.') },
      { type: 'image', image: img('caspian-reading-house/reading', L('A reading room with arched windows', 'اتاق مطالعه با پنجره‌های قوسی')), shape: 'portrait', caption: L('Reading room 07: arched windows, oak joinery.', 'اتاق مطالعه ۰۷: پنجره‌های قوسی و نجاری بلوط.') },
      { type: 'quote', text: L('“A library should feel like shelter in the rain, not like storage.”', '«کتابخانه باید مثل پناه گرفتن در باران باشد، نه مثل یک انبار.»'), attribution: L('Mina Sadeghi, project architect', 'مینا صادقی، معمار پروژه') },
      { type: 'image', image: img('caspian-reading-house/facade', L('Facade of timber fins', 'نمای پره‌های چوبی')), shape: 'wide', caption: L('The timber screen filters the low Caspian sun.', 'پرده چوبی نور کم‌ارتفاع خزر را صاف می‌کند.') },
      { type: 'diagram', image: img('caspian-reading-house/plan', L('First floor plan', 'نقشه طبقه اول')), caption: L('First floor plan, 1:200 — twelve pavilions around the court.', 'نقشه طبقه اول، ۱:۲۰۰ — دوازده پاویون دور حیاط.') },
      { type: 'facts', heading: L('At a glance', 'در یک نگاه'), items: [fact(L('Pavilions', 'پاویون‌ها'), L('12', '۱۲')), fact(L('Seats', 'صندلی‌ها'), L('420', '۴۲۰')), fact(L('Rain harvest', 'جمع‌آوری باران'), L('1,800 m³ / year', '۱٬۸۰۰ متر مکعب در سال')), fact(L('Standard', 'استاندارد'), L('ISO 14001', 'ISO 14001'))] },
      credits([ROLE.lead, LL(['Mina Sadeghi'], ['مینا صادقی'])], [ROLE.team, LL(['Omid Tavakoli', 'Parisa Jalali'], ['امید توکلی', 'پریسا جلالی'])], [ROLE.collab, LL(['Atelier Nord', 'Studio Hanne Berg'], ['Atelier Nord', 'Studio Hanne Berg'])]),
      { type: 'related', slugs: ['meridian-pavilion', 'naqsh-atelier-interior', 'green-spine-masterplan'] },
    ],
    related: ['meridian-pavilion', 'naqsh-atelier-interior', 'green-spine-masterplan'],
  },
  // 4 ------------------------------------------------------------------
  {
    id: 'p-04',
    slug: 'zagros-lodge',
    category: 'architecture',
    typology: 'hospitality',
    status: 'completed',
    year: 2023,
    area: 2150,
    title: L('Zagros Lodge', 'اقامتگاه زاگرس'),
    location: L('Chelgerd, Iran', 'چلگرد، ایران'),
    client: L('Zagros Hospitality Group', 'گروه گردشگری زاگرس'),
    shortDescription: L('Stone volumes set into a mountain valley like boulders.', 'حجم‌های سنگی که مانند تخته‌سنگ‌هایی در دره‌ای کوهستانی نشسته‌اند.'),
    description: LL(
      ['Zagros Lodge is a cluster of eight stone volumes that follow the fall of the valley. The rooms are small, deep and warm; the shared spaces are large and open to the mountains.', 'All stone comes from a quarry four kilometres away, and the lodge runs on a micro-hydro turbine in the stream below.'],
      ['اقامتگاه زاگرس خوشه‌ای از هشت حجم سنگی است که شیب دره را دنبال می‌کند. اتاق‌ها کوچک، عمیق و گرم‌اند؛ فضاهای مشترک بزرگ و گشوده به کوهستان.', 'تمام سنگ از معدنی در چهار کیلومتری تأمین شده و اقامتگاه با توربین ریزآبی روی نهر پایین دره برق می‌گیرد.'],
    ),
    thumbnail: zagrosHero,
    hero: zagrosHero,
    facts: [
      fact(L('Rooms', 'اتاق‌ها'), L('24 suites', '۲۴ سوئیت')),
      fact(L('Material', 'مصالح'), L('Local stone, larch, lime plaster', 'سنگ محلی، کاج لاریکس، گچ آهکی')),
      fact(L('Energy', 'انرژی'), L('Micro-hydro, 40 kW', 'ریزآبی، ۴۰ کیلووات')),
    ],
    panels: [
      { type: 'intro', body: LL(['The lodge is arranged in a loose line so that every room sees the valley and none sees another room.', 'Walls are 60 cm thick, giving the rooms a calm thermal inertia through the long mountain winter.'], ['اقامتگاه روی یک خط شکسته چیده شده تا هر اتاق دره را ببیند و هیچ اتاقی اتاق دیگر را نبیند.', 'دیوارها ۶۰ سانتی‌متر ضخامت دارند و در زمستان بلند کوهستان، اتاق‌ها را از نظر حرارتی آرام نگه می‌دارند.']) },
      { type: 'image', image: img('zagros-lodge/valley', L('The lodge in its valley', 'اقامتگاه در دره')), shape: 'wide', caption: L('The valley at golden hour.', 'دره در ساعت طلایی.') },
      { type: 'image', image: img('zagros-lodge/stone', L('Stone wall detail', 'جزئیات دیوار سنگی')), shape: 'portrait', caption: L('Dry-laid stone, 60 cm wall section.', 'سنگ خشکه‌چین، ضخامت دیوار ۶۰ سانتی‌متر.') },
      { type: 'quote', text: L('“You sleep inside the mountain, and wake up inside the view.”', '«داخل کوه می‌خوابید و داخل منظره بیدار می‌شوید.»'), attribution: L('Guest book, winter 2024', 'دفتر یادبود مهمانان، زمستان ۱۴۰۲') },
      { type: 'image', image: img('zagros-lodge/room', L('A suite interior with arched openings', 'داخل یک سوئیت با دهانه‌های قوسی')), shape: 'landscape', caption: L('Suite 12: three arched openings frame the ridge.', 'سوئیت ۱۲: سه دهانه قوسی خط‌الرأس را قاب می‌گیرند.') },
      { type: 'context', heading: L('Valley', 'دره'), body: L('Chelgerd sits at 2,300 m. Winter snow lies for five months; the lodge opens year-round with a ski-in route from the north ridge.', 'چلگرد در ارتفاع ۲٬۳۰۰ متری است. برف زمستانی پنج ماه می‌ماند و اقامتگاه تمام سال باز است، با مسیر اسکی از خط‌الرأس شمالی.'), coordinates: '32.4530° N, 50.1050° E' },
      { type: 'diagram', image: img('zagros-lodge/plan', L('Site plan', 'پلان استقرار')), caption: L('Site plan, 1:1000 — eight volumes on the contour.', 'پلان استقرار، ۱:۱۰۰۰ — هشت حجم روی خطوط تراز.') },
      credits([ROLE.lead, LL(['Kian Heydari'], ['کیان حیدری'])], [ROLE.team, LL(['Sara Moradi', 'Parisa Jalali'], ['سارا مرادی', 'پریسا جلالی'])], [ROLE.structure, LL(['Lund & Partners'], ['Lund & Partners'])]),
      { type: 'related', slugs: ['tehran-terraces', 'kavir-observatory', 'hormuz-shore-walk'] },
    ],
    related: ['tehran-terraces', 'kavir-observatory', 'hormuz-shore-walk'],
  },
  // 5 ------------------------------------------------------------------
  {
    id: 'p-05',
    slug: 'hormuz-shore-walk',
    category: 'landscape',
    typology: 'public-space',
    status: 'construction',
    year: 2025,
    area: 38000,
    title: L('Hormuz Shore Walk', 'پیاده‌راه ساحلی هرمز'),
    location: L('Bandar Abbas, Iran', 'بندرعباس، ایران'),
    client: L('Hormozgan Port & Maritime Authority', 'سازمان بنادر و دریانوردی هرمزگان'),
    shortDescription: L('A kilometre-long timber promenade lifted above the tide.', 'گذرگاهی چوبی به طول یک کیلومتر، بلند بر فراز جزر و مد.'),
    description: LL(
      ['The Shore Walk raises a one-kilometre promenade above the tidal flats on slender piers, giving the city a new horizon line to walk along.', 'Under the walk, the mangrove nursery is restored; above it, shaded pavilions, benches and a fish market face the Strait.'],
      ['پیاده‌راه ساحلی یک گذرگاه یک‌کیلومتری را روی ستون‌های باریک بالاتر از پهنه‌های جزر و مدی بلند می‌کند و به شهر خط افقی تازه‌ای برای قدم‌زدن می‌دهد.', 'زیر گذرگاه، خزانه حرا بازسازی می‌شود؛ بالای آن، سایبان‌ها، نیمکت‌ها و بازار ماهی رو به تنگه قرار دارند.'],
    ),
    thumbnail: hormuzHero,
    hero: hormuzHero,
    facts: [
      fact(L('Length', 'طول'), L('1,050 m', '۱٬۰۵۰ متر')),
      fact(L('Material', 'مصالح'), L('Thermo-ash decking, stainless fixings', 'عرشه چوبی عمل‌آوری‌شده، اتصالات ضدزنگ')),
      fact(L('Coastal engineering', 'مهندسی ساحلی'), L('Lund & Partners, Copenhagen', 'Lund & Partners، کپنهاگ')),
    ],
    panels: [
      { type: 'intro', body: LL(['The walk follows the old shoreline, which the city had forgotten. Where the tide once reached, there are now benches; where fishermen landed, a market.', 'It is built in 24 prefabricated bays, each lifted into place in a single tide.'], ['گذرگاه خط ساحلی قدیمی را دنبال می‌کند که شهر فراموشش کرده بود. جایی که جزر و مد می‌رسید اکنون نیمکت است و جایی که صیادان پهلو می‌گرفتند، بازار.', 'پروژه در ۲۴ قطعه پیش‌ساخته اجرا می‌شود که هر کدام در یک جزر و مد نصب می‌گردد.']) },
      { type: 'image', image: img('hormuz-shore-walk/pier', L('The promenade at mid-tide', 'گذرگاه در میانه جزر و مد')), shape: 'wide', caption: L('The promenade at mid-tide.', 'گذرگاه در میانه جزر و مد.') },
      { type: 'quote', text: L('“For the first time the city faces the water with its front, not its back.”', '«برای نخستین بار شهر با رو، و نه با پشت، به دریا نگاه می‌کند.»'), attribution: L('Municipal planner, Bandar Abbas', 'کارشناس شهرسازی، بندرعباس') },
      { type: 'image', image: img('hormuz-shore-walk/dusk', L('The walk at dusk', 'گذرگاه هنگام غروب')), shape: 'landscape', caption: L('At dusk the walk fills with families.', 'هنگام غروب، گذرگاه پر از خانواده‌ها می‌شود.') },
      { type: 'image', image: img('hormuz-shore-walk/detail', L('Detail of the timber slats', 'جزئیات تیغه‌های چوبی')), shape: 'portrait', caption: L('Slatted deck: 18 mm gaps drain the spray.', 'عرشه شیاردار: شکاف ۱۸ میلی‌متری آب پاشیده را تخلیه می‌کند.') },
      { type: 'diagram', image: img('hormuz-shore-walk/plan', L('Promenade plan', 'پلان پیاده‌راه')), caption: L('Promenade plan, 1:1000.', 'پلان پیاده‌راه، ۱:۱۰۰۰.') },
      { type: 'context', heading: L('The Strait', 'تنگه'), body: L('Bandar Abbas faces the Strait of Hormuz; the tidal range here is 3.4 m. The piers are designed for 50-year storm surge.', 'بندرعباس رو به تنگه هرمز است و دامنه جزر و مد در اینجا ۳٫۴ متر است. ستون‌ها برای طوفان ۵۰ ساله طراحی شده‌اند.'), coordinates: '27.1832° N, 56.2666° E' },
      credits([ROLE.lead, LL(['Omid Tavakoli'], ['امید توکلی'])], [ROLE.landscape, LL(['Green Atelier', 'Studio Hanne Berg'], ['آتلیه سبز', 'Studio Hanne Berg'])], [ROLE.collab, LL(['Lund & Partners'], ['Lund & Partners'])]),
      { type: 'related', slugs: ['green-spine-masterplan', 'zagros-lodge', 'kavir-observatory'] },
    ],
    related: ['green-spine-masterplan', 'zagros-lodge', 'kavir-observatory'],
  },
  // 6 ------------------------------------------------------------------
  {
    id: 'p-06',
    slug: 'green-spine-masterplan',
    category: 'planning',
    typology: 'urban',
    status: 'concept',
    year: 2026,
    area: 1200000,
    title: L('Green Spine Masterplan', 'طرح جامع ستون فقرات سبز'),
    location: L('Shiraz, Iran', 'شیراز، ایران'),
    client: L('Shiraz Urban Renewal Company', 'شرکت نوسازی شهری شیراز'),
    shortDescription: L('A 120-hectare district stitched together by one continuous park.', 'محله‌ای ۱۲۰ هکتاری که با یک پارک پیوسته به هم دوخته می‌شود.'),
    description: LL(
      ['The masterplan organises 120 hectares of former industrial land along a single continuous park, the Green Spine, with courtyards of mixed use set on either side.', 'Every home is within a five-minute walk of the spine, and the spine itself is a flood channel, a cycle route and a public garden.'],
      ['طرح جامع ۱۲۰ هکتار زمین صنعتی سابق را در امتداد یک پارک پیوسته، یعنی ستون فقرات سبز، سازمان می‌دهد و حیاط‌هایی با کاربری مختلط در دو سوی آن می‌نشاند.', 'هر خانه در پنج دقیقه پیاده‌روی از ستون فقرات قرار دارد و خود ستون فقرات هم مسیل سیلاب، مسیر دوچرخه و باغ عمومی است.'],
    ),
    thumbnail: spineHero,
    hero: spineHero,
    facts: [
      fact(L('Area', 'مساحت'), L('120 ha', '۱۲۰ هکتار')),
      fact(L('Homes', 'واحدها'), L('9,500', '۹٬۵۰۰')),
      fact(L('Green space', 'فضای سبز'), L('42% of the site', '۴۲٪ از سایت')),
    ],
    panels: [
      { type: 'intro', heading: L('One park, many courtyards', 'یک پارک، چندین حیاط'), body: LL(['The Green Spine is where the district drains, walks and gathers. Courtyard blocks give it edges; shops and schools give it reasons to be crossed.', 'The plan is phased in four stages of eight years each, and is designed to be useful at every stage.'], ['ستون فقرات سبز جایی است که محله در آن زهکشی می‌شود، قدم می‌زند و گرد هم می‌آید. بلوک‌های حیاط‌دار لبه‌هایش را می‌سازند و مغازه‌ها و مدارس دلیل عبور از آن می‌شوند.', 'طرح در چهار مرحله هشت‌ساله اجرا می‌شود و در هر مرحله کارآمد است.']) },
      { type: 'diagram', image: img('green-spine-masterplan/plan', L('Masterplan drawing', 'نقشه طرح جامع')), caption: L('Masterplan, 1:5000.', 'طرح جامع، ۱:۵۰۰۰.') },
      { type: 'image', image: img('green-spine-masterplan/district', L('Aerial view of a district block', 'نمای هوایی یک بلوک محله')), shape: 'landscape', caption: L('A typical courtyard block, 80 × 80 m.', 'یک بلوک حیاط‌دار معمول، ۸۰ در ۸۰ متر.') },
      { type: 'quote', text: L('“A district is not a plan; it is the sum of how people cross it.”', '«محله یک نقشه نیست؛ مجموع راه‌هایی است که مردم از آن می‌گذرند.»'), attribution: L('Arman Rahimi, urban design lead', 'آرمان رحیمی، مدیر طراحی شهری') },
      { type: 'image', image: img('green-spine-masterplan/street', L('A street with stepped volumes', 'خیابانی با حجم‌های پلکانی')), shape: 'landscape', caption: L('Typical street: 18 m wide, trees on both sides.', 'خیابان معمول: ۱۸ متر عرض، درخت در دو سو.') },
      { type: 'diagram', image: img('green-spine-masterplan/section', L('Street section', 'برش خیابان')), caption: L('Street section, 1:100.', 'برش خیابان، ۱:۱۰۰.') },
      { type: 'facts', heading: L('Targets', 'اهداف'), items: [fact(L('Walk to the spine', 'پیاده‌روی تا ستون فقرات'), L('< 5 min', 'کمتر از ۵ دقیقه')), fact(L('Tree canopy', 'تاج پوشش درختی'), L('35%', '۳۵٪')), fact(L('Rain retained', 'آب باران نگهداری‌شده'), L('80%', '۸۰٪')), fact(L('Rating', 'ارزیابی'), L('LEED ND Gold (target)', 'LEED ND Gold (هدف)'))] },
      credits([ROLE.lead, LL(['Arman Rahimi'], ['آرمان رحیمی'])], [ROLE.team, LL(['Neda Karimi', 'Mina Sadeghi', 'Kian Heydari', 'Parisa Jalali'], ['ندا کریمی', 'مینا صادقی', 'کیان حیدری', 'پریسا جلالی'])], [ROLE.collab, LL(['Studio Hanne Berg', 'Lund & Partners'], ['Studio Hanne Berg', 'Lund & Partners'])]),
      { type: 'related', slugs: ['tehran-terraces', 'hormuz-shore-walk', 'caspian-reading-house'] },
    ],
    related: ['tehran-terraces', 'hormuz-shore-walk', 'caspian-reading-house'],
  },
  // 7 ------------------------------------------------------------------
  {
    id: 'p-07',
    slug: 'naqsh-atelier-interior',
    category: 'interiors',
    typology: 'culture',
    status: 'completed',
    year: 2023,
    area: 640,
    title: L('Naqsh Atelier Interior', 'فضای داخلی آتلیه نقش'),
    location: L('Tehran, Iran', 'تهران، ایران'),
    client: L('NAQSH Design Foundation', 'بنیاد طراحی NAQSH'),
    shortDescription: L('A gallery and workshop carved from a former printing house.', 'گالری و کارگاهی که از یک چاپخانه قدیمی تراشیده شده است.'),
    description: LL(
      ['The atelier turns a former printing house into a gallery, a workshop and a library. Arched openings cut into the old brick walls borrow light from the courtyard.', 'Furniture is built from the demolished interior — every bench and table has a former life as a floor joist or a print-room shelf.'],
      ['آتلیه یک چاپخانه قدیمی را به گالری، کارگاه و کتابخانه بدل می‌کند. دهانه‌های قوسی که در دیوارهای آجری قدیمی بریده شده‌اند، از حیاط نور وام می‌گیرند.', 'مبلمان از مصالح تخریب‌شده داخل ساخته شده است؛ هر نیمکت و میز زمانی تیرچه کف یا قفسه چاپخانه بوده است.'],
    ),
    thumbnail: naqshHero,
    hero: naqshHero,
    facts: [
      fact(L('Reused material', 'مصالح بازیافتی'), L('72% by weight', '۷۲٪ وزنی')),
      fact(L('Lighting', 'نورپردازی'), L('Warm 2200 K LED, dimmable', 'LED گرم ۲۲۰۰ کلوین، قابل تنظیم')),
      fact(L('Programme', 'برنامه'), L('Gallery, workshop, library', 'گالری، کارگاه، کتابخانه')),
    ],
    panels: [
      { type: 'intro', body: LL(['The existing brick walls were left raw. New work is limited to three gestures: the arched openings, a timber floor and a ceiling of warm light.', 'In the evening the arches glow like lanterns from the street.'], ['دیوارهای آجری موجود خام ماندند. کار تازه به سه حرکت محدود است: دهانه‌های قوسی، کف چوبی و سقفی از نور گرم.', 'شب‌ها قوس‌ها مانند فانوس از خیابان می‌درخشند.']) },
      { type: 'image', image: img('naqsh-atelier-interior/gallery', L('Gallery with five arched openings', 'گالری با پنج دهانه قوسی')), shape: 'portrait', caption: L('The gallery: five openings, one axis.', 'گالری: پنج دهانه، یک محور.') },
      { type: 'quote', text: L('“Nothing here was bought new. Everything is the building remembering itself.”', '«اینجا هیچ‌چیز نو خریده نشده؛ همه‌چیز خاطره خود ساختمان است.»'), attribution: L('Sara Moradi, interior architect', 'سارا مرادی، معمار داخلی') },
      { type: 'image', image: img('naqsh-atelier-interior/screen', L('Timber screen detail', 'جزئیات پرده چوبی')), shape: 'landscape', caption: L('A timber screen divides workshop and gallery.', 'پرده‌ای چوبی کارگاه و گالری را جدا می‌کند.') },
      { type: 'image', image: img('naqsh-atelier-interior/vaults', L('Vaulted arcade in the courtyard', 'آرکید طاق‌دار در حیاط')), shape: 'landscape', caption: L('The courtyard arcade, added in the second phase.', 'آرکید حیاط، افزوده‌شده در مرحله دوم.') },
      { type: 'diagram', image: img('naqsh-atelier-interior/plan', L('Floor plan', 'پلان طبقه')), caption: L('Floor plan, 1:50.', 'پلان طبقه، ۱:۵۰.') },
      { type: 'context', heading: L('Address', 'نشانی'), body: L('Enghelab Street, near the bookshop quarter. The atelier is open Saturday to Wednesday, 09:00–17:00.', 'خیابان انقلاب، نزدیک محله کتاب‌فروشی‌ها. آتلیه شنبه تا چهارشنبه، ۰۹:۰۰ تا ۱۷:۰۰ باز است.'), coordinates: '35.7012° N, 51.3896° E' },
      credits([ROLE.lead, LL(['Sara Moradi'], ['سارا مرادی'])], [ROLE.team, LL(['Parisa Jalali', 'Omid Tavakoli'], ['پریسا جلالی', 'امید توکلی'])], [ROLE.light, LL(['Lumen Studio'], ['Lumen Studio'])]),
      { type: 'related', slugs: ['meridian-pavilion', 'caspian-reading-house', 'tehran-terraces'] },
    ],
    related: ['meridian-pavilion', 'caspian-reading-house', 'tehran-terraces'],
  },
  // 8 ------------------------------------------------------------------
  {
    id: 'p-08',
    slug: 'kavir-observatory',
    category: 'architecture',
    typology: 'science',
    status: 'concept',
    year: 2026,
    area: 5600,
    title: L('Kavir Observatory', 'رصدخانه کویر'),
    location: L('Garmsar, Iran', 'گرمسار، ایران'),
    client: L('Iranian National Observatory', 'رصدخانه ملی ایران'),
    shortDescription: L('A research dome and a low visitor wing in the dark desert sky.', 'گنبدی پژوهشی و بال کم‌ارتفاع بازدیدکنندگان در آسمان تاریک کویر.'),
    description: LL(
      ['The Kavir Observatory sits at the edge of a protected dark-sky zone. A research dome on a stout drum rises from the dunes; a low visitor wing hides behind them.', 'All lighting is below the horizon line, and the building is clad in the colour of the desert so that it disappears by day.'],
      ['رصدخانه کویر در لبه یک پهنه حفاظت‌شده آسمان تاریک ایستاده است. گنبدی پژوهشی بر استوانه‌ای قطور از میان تپه‌ها بالا می‌آید و بال کم‌ارتفاع بازدیدکنندگان پشت آن‌ها پنهان است.', 'تمام روشنایی زیر خط افق است و ساختمان به رنگ کویر پوشیده شده تا در روز ناپدید شود.'],
    ),
    thumbnail: kavirHero,
    hero: kavirHero,
    facts: [
      fact(L('Telescope', 'تلسکوپ'), L('2.4 m reflector', 'بازتابی ۲٫۴ متری')),
      fact(L('Dark sky', 'آسمان تاریک'), L('Bortle class 2', 'کلاس ۲ بورتل')),
      fact(L('Lighting', 'نور'), L('Below horizon, 1800 K', 'زیر خط افق، ۱۸۰۰ کلوین')),
    ],
    panels: [
      { type: 'intro', body: LL(['By day the observatory is a quiet silhouette on the dunes. By night the dome opens and the visitors’ wing glows at the horizon line, no higher.', 'The drum is cast on site with local sand and lime, giving it the colour and temperature of the ground.'], ['در روز، رصدخانه سیمایی آرام بر تپه‌هاست. شب‌ها گنبد باز می‌شود و بال بازدیدکنندگان در خط افق می‌درخشد و نه بالاتر.', 'استوانه در محل با ماسه و آهک محلی ریخته می‌شود تا رنگ و دمای زمین را بگیرد.']) },
      { type: 'image', image: img('kavir-observatory/night', L('The observatory at night', 'رصدخانه در شب')), shape: 'portrait', caption: L('At night the dome opens to the sky.', 'شب‌ها گنبد به آسمان باز می‌شود.') },
      { type: 'quote', text: L('“The darkest thing we built here is the lighting plan.”', '«تاریک‌ترین چیزی که اینجا ساختیم، طرح روشنایی است.»'), attribution: L('Kian Heydari, lighting lead', 'کیان حیدری، مسئول روشنایی') },
      { type: 'image', image: img('kavir-observatory/tower', L('A neighbouring research tower', 'برج پژوهشی همسایه')), shape: 'portrait', caption: L('The researchers’ tower, five stacked volumes.', 'برج پژوهشگران، پنج حجم روی هم.') },
      { type: 'image', image: img('kavir-observatory/dunes', L('Terraces among dunes', 'تراس‌هایی میان تپه‌ها')), shape: 'wide', caption: L('Visitor terraces cut into the dune.', 'تراس‌های بازدیدکننده در دل تپه.') },
      { type: 'diagram', image: img('kavir-observatory/section', L('Section through the dome', 'برش از گنبد')), caption: L('Section through the dome, 1:100.', 'برش از میان گنبد، ۱:۱۰۰.') },
      { type: 'facts', heading: L('At a glance', 'در یک نگاه'), items: [fact(L('Dome diameter', 'قطر گنبد'), L('14 m', '۱۴ متر')), fact(L('Altitude', 'ارتفاع'), L('1,050 m', '۱٬۰۵۰ متر')), fact(L('Clear nights', 'شب‌های صاف'), L('290 / year', '۲۹۰ در سال')), fact(L('Contact', 'تماس'), L('research@ravino.studio', 'research@ravino.studio'))] },
      { type: 'context', heading: L('Desert', 'کویر'), body: L('Garmsar is 120 km south-east of Tehran. The site is reached by a 9 km gravel road from the Kavir highway.', 'گرمسار ۱۲۰ کیلومتر جنوب‌شرقی تهران است. دسترسی به سایت از بزرگراه کویر با ۹ کیلومتر جاده خاکی است.'), coordinates: '35.2183° N, 52.3400° E' },
      credits([ROLE.lead, LL(['Kian Heydari'], ['کیان حیدری'])], [ROLE.team, LL(['Neda Karimi', 'Arman Rahimi'], ['ندا کریمی', 'آرمان رحیمی'])], [ROLE.collab, LL(['Atelier Nord', 'Lumen Studio'], ['Atelier Nord', 'Lumen Studio'])]),
      { type: 'related', slugs: ['zagros-lodge', 'hormuz-shore-walk', 'meridian-pavilion'] },
    ],
    related: ['zagros-lodge', 'hormuz-shore-walk', 'meridian-pavilion'],
  },
]

// ---------------------------------------------------------------- queries
const bySlug = new Map(projects.map((p) => [p.slug, p]))

export function getProject(slug: string): Project | undefined {
  return bySlug.get(slug)
}

export function getProjectIndex(slug: string): number {
  return projects.findIndex((p) => p.slug === slug)
}
