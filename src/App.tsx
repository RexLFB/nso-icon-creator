import { useEffect } from 'react';
import { Stage } from './components/Stage';
import { loadCatalog } from './lib/catalog';
import { CategorySelect } from './screens/CategorySelect';
import { IconEditor } from './screens/IconEditor';
import { PartPicker } from './screens/PartPicker';
import { RandomIcons } from './screens/RandomIcons';
import { useCreator } from './store';
import './screens.css';

export default function App() {
  const screen = useCreator((s) => s.screen);
  const error = useCreator((s) => s.error);
  const setCatalog = useCreator((s) => s.setCatalog);
  const setError = useCreator((s) => s.setError);

  useEffect(() => {
    loadCatalog().then(setCatalog).catch((err: Error) => setError(err.message));
  }, [setCatalog, setError]);

  useEffect(() => {
    const down = new Set<string>();
    let raf = 0;
    const tick = () => {
      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        const fire = (name: string, pressed: boolean, key: string) => {
          if (pressed && !down.has(name)) {
            down.add(name);
            window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
          }
          if (!pressed) down.delete(name);
        };
        fire('a', pad.buttons[0]?.pressed ?? false, 'Enter');
        fire('b', pad.buttons[1]?.pressed ?? false, 'Escape');
        fire('y', pad.buttons[3]?.pressed ?? false, 'y');
        fire('left', (pad.axes[0] ?? 0) < -0.55 || (pad.buttons[14]?.pressed ?? false), 'ArrowLeft');
        fire('right', (pad.axes[0] ?? 0) > 0.55 || (pad.buttons[15]?.pressed ?? false), 'ArrowRight');
        fire('up', (pad.axes[1] ?? 0) < -0.55 || (pad.buttons[12]?.pressed ?? false), 'ArrowUp');
        fire('down', (pad.axes[1] ?? 0) > 0.55 || (pad.buttons[13]?.pressed ?? false), 'ArrowDown');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  let body;
  if (error) body = <div className="boot">{error}</div>;
  else if (screen === 'category') body = <CategorySelect />;
  else if (screen === 'random') body = <RandomIcons />;
  else if (screen === 'picker') body = <PartPicker />;
  else body = <IconEditor />;

  return <Stage>{body}</Stage>;
}
