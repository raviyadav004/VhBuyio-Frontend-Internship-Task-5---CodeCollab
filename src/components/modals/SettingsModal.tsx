import { useId } from 'react';
import { toast } from 'sonner';
import clsx from 'clsx';
import type { ThemeName } from '@/types';
import { useEditorStore, DEFAULT_SETTINGS } from '@/stores/editorStore';
import { useUiStore } from '@/stores/uiStore';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/IconButton';
import styles from './Modals.module.css';

interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <span className={styles.switch}>
      <input
        type="checkbox"
        className={styles.switchInput}
        checked={checked}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.switchTrack} />
      <span className={styles.switchThumb} />
    </span>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

function Row({ label, hint, children, htmlFor }: RowProps) {
  return (
    <div className={styles.settingRow}>
      <div>
        <label className={styles.settingLabel} htmlFor={htmlFor}>
          {label}
        </label>
        {hint && <p className={styles.settingHint}>{hint}</p>}
      </div>

      <div className={styles.settingControl}>{children}</div>
    </div>
  );
}

const THEMES: Array<{ id: ThemeName; label: string; sidebar: string; main: string }> = [
  { id: 'dark', label: 'Dark', sidebar: '#1a1a23', main: '#16161e' },
  { id: 'light', label: 'Light', sidebar: '#f7f8fa', main: '#ffffff' },
  { id: 'midnight', label: 'Midnight', sidebar: '#0e1428', main: '#0b1021' },
];

const FONT_STACKS = [
  { label: 'JetBrains Mono', value: DEFAULT_SETTINGS.fontFamily },
  { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'System monospace', value: 'ui-monospace, monospace' },
];

export function SettingsModal() {
  const open = useUiStore((s) => s.modal === 'settings');
  const closeModal = useUiStore((s) => s.closeModal);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const settings = useEditorStore((s) => s.settings);
  const updateSettings = useEditorStore((s) => s.updateSettings);
  const resetSettings = useEditorStore((s) => s.resetSettings);
  const fontSizeId = useId();
  const tabSizeId = useId();
  const fontFamilyId = useId();
  return (
    <Modal
      open={open}
      title="Settings"
      onClose={closeModal}
      centered
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              resetSettings();
              toast('Editor settings restored to defaults');
            }}
          >
            Reset to defaults
          </Button>
          <Button variant="primary" onClick={closeModal}>
            Done
          </Button>
        </>
      }
    >
      <section className={styles.settingsSection}>
        <h3 className={styles.sectionTitle}>Appearance</h3>

        <div className={styles.themeGrid}>
          {THEMES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={clsx(
                styles.themeOption,
                theme === option.id && styles.themeOptionActive,
              )}
              aria-pressed={theme === option.id}
              onClick={() => setTheme(option.id)}
            >
              <span className={styles.themeSwatch} aria-hidden="true">
                <span
                  className={styles.swatchSidebar}
                  style={{ background: option.sidebar }}
                />
                <span className={styles.swatchMain} style={{ background: option.main }} />
              </span>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.settingsSection}>
        <h3 className={styles.sectionTitle}>Editor</h3>

        <Row label="Font size" hint="Between 10 and 28 pixels" htmlFor={fontSizeId}>
          <input
            id={fontSizeId}
            type="number"
            min={10}
            max={28}
            value={settings.fontSize}
            className={styles.numberInput}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) {
                updateSettings({ fontSize: Math.min(28, Math.max(10, next)) });
              }
            }}
          />
        </Row>

        <Row label="Font family" htmlFor={fontFamilyId}>
          <select
            id={fontFamilyId}
            className={styles.select}
            value={settings.fontFamily}
            onChange={(e) => updateSettings({ fontFamily: e.target.value })}
          >
            {FONT_STACKS.map((font) => (
              <option key={font.label} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Tab size" hint="Spaces per indentation level" htmlFor={tabSizeId}>
          <select
            id={tabSizeId}
            className={styles.select}
            value={settings.tabSize}
            onChange={(e) => updateSettings({ tabSize: Number(e.target.value) })}
          >
            {[2, 4, 8].map((size) => (
              <option key={size} value={size}>
                {size} spaces
              </option>
            ))}
          </select>
        </Row>

        <Row label="Word wrap" hint="Wrap long lines instead of scrolling">
          <Toggle
            label="Word wrap"
            checked={settings.wordWrap}
            onChange={(wordWrap) => updateSettings({ wordWrap })}
          />
        </Row>

        <Row label="Minimap" hint="Show the document overview on the right">
          <Toggle
            label="Minimap"
            checked={settings.minimap}
            onChange={(minimap) => updateSettings({ minimap })}
          />
        </Row>

        <Row label="Line numbers">
          <Toggle
            label="Line numbers"
            checked={settings.lineNumbers}
            onChange={(lineNumbers) => updateSettings({ lineNumbers })}
          />
        </Row>

        <Row label="Bracket pair colours" hint="Colour matching brackets by depth">
          <Toggle
            label="Bracket pair colourisation"
            checked={settings.bracketPairColorization}
            onChange={(bracketPairColorization) =>
              updateSettings({ bracketPairColorization })
            }
          />
        </Row>
      </section>

      <section className={styles.settingsSection}>
        <h3 className={styles.sectionTitle}>Workspace</h3>

        <Row
          label="Auto save"
          hint="Write changes to browser storage as you type"
        >
          <Toggle
            label="Auto save"
            checked={settings.autoSave}
            onChange={(autoSave) => updateSettings({ autoSave })}
          />
        </Row>

        <p className={styles.settingHint}>
          Projects, tabs and preferences are stored in this browser's localStorage.
          Nothing is uploaded anywhere.
        </p>
      </section>
    </Modal>
  );
}