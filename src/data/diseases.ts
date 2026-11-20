export type CropId =
  | 'apple' | 'blueberry' | 'cherry' | 'corn' | 'grape' | 'orange' | 'peach'
  | 'pepper' | 'potato' | 'raspberry' | 'soybean' | 'squash' | 'strawberry' | 'tomato';

export interface Crop {
  id: CropId;
  name: string;
  emoji: string;
}

export type PathogenType = 'гриб' | 'ооміцет' | 'бактерія' | 'вірус' | 'шкідник' | 'комплекс грибів' | '—';

export interface PlantClass {
  id: string;
  crop: CropId;
  healthy: boolean;
  name: string;
  latin?: string;
  pathogenType: PathogenType;

  danger: 0 | 1 | 2 | 3;
  symptoms: string;
  treatment: string[];
  prevention: string[];
}

export const CROPS: Crop[] = [
  { id: 'apple', name: 'Яблуня', emoji: '🍎' },
  { id: 'blueberry', name: 'Лохина', emoji: '🫐' },
  { id: 'cherry', name: 'Вишня', emoji: '🍒' },
  { id: 'corn', name: 'Кукурудза', emoji: '🌽' },
  { id: 'grape', name: 'Виноград', emoji: '🍇' },
  { id: 'orange', name: 'Апельсин', emoji: '🍊' },
  { id: 'peach', name: 'Персик', emoji: '🍑' },
  { id: 'pepper', name: 'Перець солодкий', emoji: '🫑' },
  { id: 'potato', name: 'Картопля', emoji: '🥔' },
  { id: 'raspberry', name: 'Малина', emoji: '🌿' },
  { id: 'soybean', name: 'Соя', emoji: '🌱' },
  { id: 'squash', name: 'Гарбуз / кабачок', emoji: '🎃' },
  { id: 'strawberry', name: 'Суниця', emoji: '🍓' },
  { id: 'tomato', name: 'Томат', emoji: '🍅' },
];

const HEALTHY_TREATMENT = ['Лікування не потрібне.'];
const HEALTHY_PREVENTION = [
  'Регулярно оглядайте рослини — повторну діагностику варто робити раз на 7–10 днів.',
  'Дотримуйтеся сівозміни та оптимальної густоти посадки.',
  'Уникайте надмірного зволоження листя під час поливу.',
];

function healthy(crop: CropId, id: string): PlantClass {
  return {
    id,
    crop,
    healthy: true,
    name: 'Здорова рослина',
    pathogenType: '—',
    danger: 0,
    symptoms: 'Листкова пластинка рівномірно забарвлена, без плям, нальоту, деформацій чи некрозів.',
    treatment: HEALTHY_TREATMENT,
    prevention: HEALTHY_PREVENTION,
  };
}

const FUNGICIDE_NOTE =
  'Застосовуйте лише препарати з Державного реєстру пестицидів і агрохімікатів, дозволених до використання в Україні, суворо за інструкцією виробника.';

export const CLASSES: PlantClass[] = [

  {
    id: 'Apple___Apple_scab', crop: 'apple', healthy: false, name: 'Парша яблуні',
    latin: 'Venturia inaequalis', pathogenType: 'гриб', danger: 2,
    symptoms: 'Оливково-бурі плями з оксамитовим нальотом на верхньому боці листка; згодом листя жовтіє та опадає, на плодах — темні тріщинуваті плями.',
    treatment: ['Видаліть і знищіть уражене листя та плоди.', 'Проведіть обробку фунгіцидами (мідь- або сірковмісними) у фазі розпускання бруньок та після цвітіння.', FUNGICIDE_NOTE],
    prevention: ['Восени збирайте та компостуйте опале листя.', 'Проріджуйте крону для кращого провітрювання.', 'Обирайте стійкі до парші сорти.'],
  },
  {
    id: 'Apple___Black_rot', crop: 'apple', healthy: false, name: 'Чорна гниль яблуні',
    latin: 'Botryosphaeria obtusa', pathogenType: 'гриб', danger: 2,
    symptoms: 'Плями «жаб\'яче око» — фіолетова облямівка з коричневим центром; на гілках утворюються виразки, плоди муміфікуються.',
    treatment: ['Вирізайте уражені гілки на 15–20 см нижче межі ураження.', 'Знищуйте муміфіковані плоди.', FUNGICIDE_NOTE],
    prevention: ['Санітарна обрізка взимку.', 'Захист кори від механічних пошкоджень і сонячних опіків.'],
  },
  {
    id: 'Apple___Cedar_apple_rust', crop: 'apple', healthy: false, name: 'Іржа яблуні',
    latin: 'Gymnosporangium juniperi-virginianae', pathogenType: 'гриб', danger: 1,
    symptoms: 'Яскраві жовто-оранжеві плями на верхньому боці листка, на нижньому — бугорки з спороношенням.',
    treatment: ['Видаліть сильно уражене листя.', 'Застосуйте фунгіцид у період від рожевого бутона до кінця цвітіння.', FUNGICIDE_NOTE],
    prevention: ['Не висаджуйте поруч ялівець — проміжного хазяїна збудника.', 'Використовуйте стійкі сорти.'],
  },
  healthy('apple', 'Apple___healthy'),

  healthy('blueberry', 'Blueberry___healthy'),

  {
    id: 'Cherry_(including_sour)___Powdery_mildew', crop: 'cherry', healthy: false, name: 'Борошниста роса вишні',
    latin: 'Podosphaera clandestina', pathogenType: 'гриб', danger: 1,
    symptoms: 'Білий борошнистий наліт на молодому листі та пагонах; листя скручується й деформується.',
    treatment: ['Видаліть уражені пагони.', 'Обробіть сірковмісними препаратами або біофунгіцидами.', FUNGICIDE_NOTE],
    prevention: ['Уникайте надлишку азотних добрив.', 'Забезпечте провітрювання крони.'],
  },
  healthy('cherry', 'Cherry_(including_sour)___healthy'),

  {
    id: 'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot', crop: 'corn', healthy: false, name: 'Церкоспороз (сіра плямистість) кукурудзи',
    latin: 'Cercospora zeae-maydis', pathogenType: 'гриб', danger: 2,
    symptoms: 'Видовжені прямокутні сіро-коричневі плями, обмежені жилками листка.',
    treatment: ['За сильного ураження застосуйте фунгіцид у фазі викидання волоті.', FUNGICIDE_NOTE],
    prevention: ['Сівозміна (не сіяти кукурудзу після кукурудзи).', 'Заорювання рослинних решток.', 'Стійкі гібриди.'],
  },
  {
    id: 'Corn_(maize)___Common_rust_', crop: 'corn', healthy: false, name: 'Звичайна іржа кукурудзи',
    latin: 'Puccinia sorghi', pathogenType: 'гриб', danger: 1,
    symptoms: 'Дрібні округлі або видовжені коричнево-червоні пустули на обох боках листка.',
    treatment: ['На насінницьких посівах — фунгіцидна обробка на початку розвитку хвороби.', FUNGICIDE_NOTE],
    prevention: ['Використовуйте стійкі гібриди.', 'Оптимальні строки сівби.'],
  },
  {
    id: 'Corn_(maize)___Northern_Leaf_Blight', crop: 'corn', healthy: false, name: 'Гельмінтоспороз (північна плямистість) кукурудзи',
    latin: 'Exserohilum turcicum', pathogenType: 'гриб', danger: 2,
    symptoms: 'Великі сигароподібні сіро-зелені, згодом бурі плями довжиною 3–15 см.',
    treatment: ['Фунгіцидна обробка за перших симптомів на верхніх ярусах.', FUNGICIDE_NOTE],
    prevention: ['Сівозміна та обробіток ґрунту.', 'Стійкі гібриди.'],
  },
  healthy('corn', 'Corn_(maize)___healthy'),

  {
    id: 'Grape___Black_rot', crop: 'grape', healthy: false, name: 'Чорна гниль винограду',
    latin: 'Guignardia bidwellii', pathogenType: 'гриб', danger: 3,
    symptoms: 'Червоно-бурі плями з темною облямівкою та чорними крапками пікнід; ягоди зморщуються й чорніють.',
    treatment: ['Видаліть уражені грона та листя.', 'Профілактичні обробки фунгіцидами від появи 3–4 листків до закриття грона.', FUNGICIDE_NOTE],
    prevention: ['Знищення муміфікованих ягід.', 'Провітрювання кущів, підв\'язування пагонів.'],
  },
  {
    id: 'Grape___Esca_(Black_Measles)', crop: 'grape', healthy: false, name: 'Еска (чорна кір) винограду',
    latin: 'Phaeomoniella chlamydospora, Phaeoacremonium spp.', pathogenType: 'комплекс грибів', danger: 3,
    symptoms: '«Тигрові» міжжилкові хлоротичні та некротичні смуги на листі, темні цятки на ягодах; можливе раптове всихання куща.',
    treatment: ['Вирізайте уражені рукави до здорової деревини.', 'Обробляйте зрізи захисними пастами.', 'Сильно уражені кущі видаляють.'],
    prevention: ['Обрізка в суху погоду та дезінфекція інструменту.', 'Використання здорового садивного матеріалу.'],
  },
  {
    id: 'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)', crop: 'grape', healthy: false, name: 'Ізаріопсисна плямистість листя винограду',
    latin: 'Pseudocercospora vitis', pathogenType: 'гриб', danger: 1,
    symptoms: 'Неправильної форми бурі плями з жовтою облямівкою, на нижньому боці — темний наліт.',
    treatment: ['Видаліть уражене листя.', FUNGICIDE_NOTE],
    prevention: ['Регулярне проріджування листя.', 'Збалансоване живлення.'],
  },
  healthy('grape', 'Grape___healthy'),

  {
    id: 'Orange___Haunglongbing_(Citrus_greening)', crop: 'orange', healthy: false, name: 'Хуанлунбін (позеленіння цитрусових)',
    latin: 'Candidatus Liberibacter spp.', pathogenType: 'бактерія', danger: 3,
    symptoms: 'Асиметричний плямистий хлороз листя, дрібні деформовані гіркі плоди, що залишаються зеленими.',
    treatment: ['Ефективного лікування не існує — уражені дерева видаляють.', 'Контролюйте переносника — азійську цитрусову листоблішку.'],
    prevention: ['Використовуйте сертифікований садивний матеріал.', 'Регулярний моніторинг переносника.'],
  },

  {
    id: 'Peach___Bacterial_spot', crop: 'peach', healthy: false, name: 'Бактеріальна плямистість персика',
    latin: 'Xanthomonas arboricola pv. pruni', pathogenType: 'бактерія', danger: 2,
    symptoms: 'Дрібні кутасті водянисті плями, що буріють і випадають («дірчастість» листя).',
    treatment: ['Обробка мідьвмісними препаратами в період спокою та на початку вегетації.', FUNGICIDE_NOTE],
    prevention: ['Стійкі сорти.', 'Уникайте дощувального поливу.'],
  },
  healthy('peach', 'Peach___healthy'),

  {
    id: 'Pepper,_bell___Bacterial_spot', crop: 'pepper', healthy: false, name: 'Бактеріальна плямистість перцю',
    latin: 'Xanthomonas euvesicatoria', pathogenType: 'бактерія', danger: 2,
    symptoms: 'Дрібні водянисті плями, що темніють і мають жовтий ореол; листя опадає.',
    treatment: ['Видаліть уражені рослини.', 'Обробка мідьвмісними препаратами.', FUNGICIDE_NOTE],
    prevention: ['Протруєне насіння.', 'Сівозміна 2–3 роки.', 'Полив під корінь.'],
  },
  healthy('pepper', 'Pepper,_bell___healthy'),

  {
    id: 'Potato___Early_blight', crop: 'potato', healthy: false, name: 'Альтернаріоз картоплі (рання суха плямистість)',
    latin: 'Alternaria solani', pathogenType: 'гриб', danger: 2,
    symptoms: 'Темно-бурі округлі плями з концентричними кільцями («мішень»), спочатку на нижньому листі.',
    treatment: ['Фунгіцидні обробки за появи перших плям.', FUNGICIDE_NOTE],
    prevention: ['Збалансоване живлення (калій).', 'Знищення бадилля після збирання.'],
  },
  {
    id: 'Potato___Late_blight', crop: 'potato', healthy: false, name: 'Фітофтороз картоплі',
    latin: 'Phytophthora infestans', pathogenType: 'ооміцет', danger: 3,
    symptoms: 'Бурі розпливчасті плями, у вологу погоду з білим нальотом на нижньому боці листка; швидке відмирання бадилля.',
    treatment: ['Негайна обробка системними та контактними фунгіцидами.', 'Видалення та знищення уражених рослин.', FUNGICIDE_NOTE],
    prevention: ['Здоровий насіннєвий матеріал.', 'Стійкі сорти.', 'Моніторинг погодних умов (тепло + висока вологість).'],
  },
  healthy('potato', 'Potato___healthy'),

  healthy('raspberry', 'Raspberry___healthy'),
  healthy('soybean', 'Soybean___healthy'),

  {
    id: 'Squash___Powdery_mildew', crop: 'squash', healthy: false, name: 'Борошниста роса гарбузових',
    latin: 'Podosphaera xanthii', pathogenType: 'гриб', danger: 1,
    symptoms: 'Білі порошисті плями на листі та черешках, що поступово зливаються; листя жовтіє й засихає.',
    treatment: ['Видаліть уражене листя.', 'Обробка сірковмісними препаратами або біофунгіцидами.', FUNGICIDE_NOTE],
    prevention: ['Стійкі сорти та гібриди.', 'Достатня відстань між рослинами.'],
  },

  {
    id: 'Strawberry___Leaf_scorch', crop: 'strawberry', healthy: false, name: 'Опік листя суниці',
    latin: 'Diplocarpon earlianum', pathogenType: 'гриб', danger: 1,
    symptoms: 'Дрібні пурпурові плями неправильної форми, що зливаються; листок виглядає «обпеченим».',
    treatment: ['Видаліть уражене листя після збору врожаю.', FUNGICIDE_NOTE],
    prevention: ['Оновлення насаджень кожні 3–4 роки.', 'Мульчування та полив під корінь.'],
  },
  healthy('strawberry', 'Strawberry___healthy'),

  {
    id: 'Tomato___Bacterial_spot', crop: 'tomato', healthy: false, name: 'Бактеріальна плямистість томата',
    latin: 'Xanthomonas spp.', pathogenType: 'бактерія', danger: 2,
    symptoms: 'Дрібні темні водянисті плями з жовтим ореолом на листі, плями-струпи на плодах.',
    treatment: ['Обробка мідьвмісними препаратами.', 'Видалення уражених рослин.', FUNGICIDE_NOTE],
    prevention: ['Знезаражене насіння.', 'Сівозміна, полив під корінь.'],
  },
  {
    id: 'Tomato___Early_blight', crop: 'tomato', healthy: false, name: 'Альтернаріоз томата',
    latin: 'Alternaria solani', pathogenType: 'гриб', danger: 2,
    symptoms: 'Бурі плями з концентричними кільцями на нижньому листі, жовтіння тканини навколо.',
    treatment: ['Видаліть нижнє уражене листя.', 'Фунгіцидні обробки.', FUNGICIDE_NOTE],
    prevention: ['Мульчування ґрунту.', 'Сівозміна, видалення рослинних решток.'],
  },
  {
    id: 'Tomato___Late_blight', crop: 'tomato', healthy: false, name: 'Фітофтороз томата',
    latin: 'Phytophthora infestans', pathogenType: 'ооміцет', danger: 3,
    symptoms: 'Великі бурі маслянисті плями на листі та стеблах, білий наліт у вологу погоду; бура гниль плодів.',
    treatment: ['Негайно видаліть уражені частини.', 'Обробка фунгіцидами системної та контактної дії.', FUNGICIDE_NOTE],
    prevention: ['Не садіть томати поруч із картоплею.', 'Провітрювання теплиць.', 'Стійкі гібриди.'],
  },
  {
    id: 'Tomato___Leaf_Mold', crop: 'tomato', healthy: false, name: 'Кладоспоріоз (бура плямистість) томата',
    latin: 'Passalora fulva', pathogenType: 'гриб', danger: 2,
    symptoms: 'Жовті плями на верхньому боці листка та оливково-бурий оксамитовий наліт на нижньому.',
    treatment: ['Знизьте вологість повітря в теплиці.', 'Видаліть уражене листя.', FUNGICIDE_NOTE],
    prevention: ['Відносна вологість нижче 85 %.', 'Стійкі гібриди.'],
  },
  {
    id: 'Tomato___Septoria_leaf_spot', crop: 'tomato', healthy: false, name: 'Септоріоз томата',
    latin: 'Septoria lycopersici', pathogenType: 'гриб', danger: 2,
    symptoms: 'Численні дрібні округлі плями з сірим центром і темною облямівкою, у центрі — чорні пікніди.',
    treatment: ['Видалення уражених листків.', 'Фунгіцидні обробки.', FUNGICIDE_NOTE],
    prevention: ['Сівозміна 3 роки.', 'Знищення бур\'янів-пасльонових.'],
  },
  {
    id: 'Tomato___Spider_mites Two-spotted_spider_mite', crop: 'tomato', healthy: false, name: 'Павутинний кліщ на томаті',
    latin: 'Tetranychus urticae', pathogenType: 'шкідник', danger: 2,
    symptoms: 'Дрібні світлі цятки (мармуровість) на листі, тонке павутиння, листя буріє та засихає.',
    treatment: ['Обробка акарицидами або біопрепаратами.', 'Випуск хижих кліщів (фітосейулюс) у теплицях.'],
    prevention: ['Підтримання вологості повітря.', 'Знищення бур\'янів.'],
  },
  {
    id: 'Tomato___Target_Spot', crop: 'tomato', healthy: false, name: 'Коринеспороз (мішенева плямистість) томата',
    latin: 'Corynespora cassiicola', pathogenType: 'гриб', danger: 2,
    symptoms: 'Бурі плями з концентричними колами та світлим центром, що можуть розтріскуватися.',
    treatment: ['Видалення уражених листків.', FUNGICIDE_NOTE],
    prevention: ['Провітрювання, уникання загущення.', 'Видалення рослинних решток.'],
  },
  {
    id: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', crop: 'tomato', healthy: false, name: 'Вірус жовтої курчавості листя томата',
    latin: 'Tomato yellow leaf curl virus (TYLCV)', pathogenType: 'вірус', danger: 3,
    symptoms: 'Пожовтіння країв і скручування листя догори, вкорочення міжвузль, карликовість рослини.',
    treatment: ['Лікування відсутнє — уражені рослини видаляють і знищують.', 'Контроль переносника — тютюнової білокрилки.'],
    prevention: ['Сітки від комах у теплицях.', 'Стійкі гібриди.', 'Жовті клейові пастки.'],
  },
  {
    id: 'Tomato___Tomato_mosaic_virus', crop: 'tomato', healthy: false, name: 'Вірус мозаїки томата',
    latin: 'Tomato mosaic virus (ToMV)', pathogenType: 'вірус', danger: 2,
    symptoms: 'Мозаїчне світло- і темно-зелене забарвлення листя, ниткоподібність листкової пластинки.',
    treatment: ['Лікування відсутнє — уражені рослини видаляють.', 'Дезінфекція інструменту та рук.'],
    prevention: ['Знезараження насіння.', 'Стійкі гібриди.'],
  },
  healthy('tomato', 'Tomato___healthy'),
];

export const CLASS_BY_ID: Record<string, PlantClass> = Object.fromEntries(CLASSES.map((c) => [c.id, c]));
export const CROP_BY_ID: Record<string, Crop> = Object.fromEntries(CROPS.map((c) => [c.id, c]));

export function classesOfCrop(crop: CropId): PlantClass[] {
  return CLASSES.filter((c) => c.crop === crop);
}

export const DANGER_LABEL = ['Немає', 'Низька', 'Середня', 'Висока'] as const;
