Surface container for July Canvas — white card with soft border, soft shadow, 16px radius. The base of project cards, document panels, and summary blocks.

```jsx
import { Card } from './Card';

<Card padded>…</Card>
<Card padded interactive onClick={open}>클릭 가능한 프로젝트 카드</Card>
<Card glass padded>플로팅 글래스 패널</Card>
```

Props: `padded` (24px interior), `interactive` (hover lift + brand border for clickable cards), `glass` (frosted glassmorphism), `as` (tag, default `div`).
