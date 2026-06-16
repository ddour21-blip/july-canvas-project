Primary action button for July Canvas — green CTA (`#50FA6E` fill, dark-green text) with a subtle green lift; use `outline`/`secondary`/`ghost` to step down emphasis, `danger` for destructive actions, `glass` for floating chrome over content.

```jsx
import { Button } from './Button';
import { Plus, Rocket } from 'lucide-react';

<Button icon={<Plus size={18} />} onClick={createProject}>새 프로젝트</Button>
<Button variant="outline" icon={<Rocket size={18} />}>활성화 시작하기</Button>
<Button variant="secondary" size="sm">취소</Button>
<Button variant="danger">삭제</Button>
```

Variants: `primary` (default), `secondary`, `outline`, `ghost`, `danger`, `glass`.
Sizes: `sm` (32px), `md` (40px, default), `lg` (44px). Use `block` to fill width.
