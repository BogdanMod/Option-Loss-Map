# SPEC — Option Loss Map (SaaS)

## Modes
1. Option Loss Map: карта потери опциональности по одному решению (граф состояний).
2. Hidden Rule Lens: выявление повторяющихся правил выбора, ведущих к потере опциональности.

## Target Audience (personas; domains are examples by default)
- Product/Strategy Lead в B2B/B2C компании: принимает решения с высокой необратимостью и внешними зависимостями.
- Ops/Founder/GM в быстрорастущем бизнесе: балансирует скорость и сохранение манёвра.
- (Optional, quiet persona) Senior IC / Consultant / Investor‑minded professional: принимает решения о работе/проектах/обязательствах, ценит инструменты мышления.

## Usage Triggers
- Решение с большим R&D/CapEx/наймами и долгим хвостом обязательств.
- Команда спорит о «точке невозврата» и последствиях.
- Исторически повторяются ошибки с потерей опциональности.

## 10‑Minute Wow Promise → One‑Screen Proof
- На одном экране пользователь видит:
- Option Loss %.
- PNR: условие/порог + горизонт (если есть).
- Closed Futures: 5–8 закрытых состояний списком.
- Evidence: 2–3 пункта из введённого контекста.

## Metric Definitions
- Option Loss %: доля пространства альтернатив, недоступная после выбранного перехода.
- Options_before = базовый набор классов будущих состояний для домена + состояния, извлечённые из текста.
- Options_after = подмножество Options_before, достижимое после перехода.
- Irreversibility (F,T,O,S):
  - F (Financial): затраты на откат/возврат.
  - T (Time): время, требуемое на откат.
  - O (Commitments & org inertia): обязательства и орг‑инерция (контракты, найм, процессы).
  - S (Strategic): стратегические ограничения/потеря направлений.
- Point of No Return: состояние/переход, после которого восстановление прежнего множества опций невозможно без неприемлемых F/T/O/S.

## Decision Domain Patterns (default pack: product/engineering)
1. Build vs Buy vs Partner.
2. Монолит vs Микросервисы.
3. In‑house data vs Third‑party data.
4. Full‑time hires vs Contractors.
5. Single‑market focus vs Multi‑market expansion.
6. Proprietary tech stack vs Open standards.
7. Fixed pricing vs Usage‑based pricing.
8. High fixed cost vs Variable cost.
9. Own vs Lease.
10. Single bet vs Portfolio of small bets.

## We Do NOT Do
- Не даём советов.
- Не коучинг.
- Только структура принятия решений + evidence.
- Не делаем предсказаний, показываем структуру возможных состояний.
- Если данных недостаточно — показываем low confidence.
