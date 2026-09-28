<script lang="ts">
  import { Popover } from 'bits-ui';
  import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-svelte';

  let { name = 'expiresAt' }: { name?: string } = $props();
  let open = $state(false);
  let selectedDate = $state('');
  let selectedTime = $state('23:59');
  let month = $state(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const days = $derived(Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() + new Date(month.getFullYear(), month.getMonth(), 1).getDay() }, (_, index) => index - new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 1));
  const value = $derived(selectedDate ? `${selectedDate}T${selectedTime}` : '');
  const label = $derived(selectedDate ? `${new Date(`${selectedDate}T12:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} · ${selectedTime}` : 'No expiry');

  function shiftMonth(offset: number) {
    month = new Date(month.getFullYear(), month.getMonth() + offset, 1);
  }
  function choose(day: number) {
    if (!day) return;
    selectedDate = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
</script>

<input type="hidden" {name} {value} />
<Popover.Root bind:open>
  <Popover.Trigger class="stage1-date-trigger" aria-label="Expires">
    <span>{label}</span><CalendarDays size={14} aria-hidden="true" />
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content class="stage1-date-content" sideOffset={4} align="end">
      <div class="calendar-heading">
        <button type="button" aria-label="Previous month" onclick={() => shiftMonth(-1)}><ChevronLeft size={15} /></button>
        <strong>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <button type="button" aria-label="Next month" onclick={() => shiftMonth(1)}><ChevronRight size={15} /></button>
      </div>
      <div class="calendar-grid">
        {#each weekdays as weekday}<span class="weekday">{weekday}</span>{/each}
        {#each days as day, index (index)}
          {#if day > 0}<button type="button" class="calendar-day" class:selected={selectedDate === `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`} aria-label={new Date(month.getFullYear(), month.getMonth(), day).toLocaleDateString(undefined, { dateStyle: 'full' })} aria-pressed={selectedDate === `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`} onclick={() => choose(day)}>{day}</button>
          {:else}<span aria-hidden="true"></span>{/if}
        {/each}
      </div>
      <label class="time-field">Time <input type="time" bind:value={selectedTime} disabled={!selectedDate} /></label>
      <div class="calendar-actions"><button type="button" onclick={() => { selectedDate = ''; open = false; }}>Clear</button><button type="button" onclick={() => open = false}>Done</button></div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>

<style>
  :global(.stage1-date-trigger) { display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;height:34px;padding:0 9px;border:1px solid var(--border);border-radius:5px;background:var(--canvas);color:var(--ink);font:inherit;font-size:12px;text-align:left; }
  :global(.stage1-date-trigger svg) { flex:none;color:var(--muted); }
  :global(.stage1-date-trigger:focus-visible),:global(.stage1-date-content button:focus-visible),:global(.stage1-date-content input:focus-visible) { outline:1px solid var(--accent);outline-offset:2px; }
  :global(.stage1-date-content) { z-index:110;width:288px;max-width:calc(100vw - 24px);padding:12px;border:1px solid var(--border);border-radius:6px;background:color-mix(in srgb,var(--raised) 70%,transparent);backdrop-filter:blur(18px);box-shadow:0 10px 30px #0008;color:var(--ink); }
  .calendar-heading { display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:10px; }
  .calendar-heading strong { font-size:12px;font-weight:550; }
  button { display:inline-flex;align-items:center;justify-content:center;min-width:28px;min-height:28px;padding:0 7px;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--ink);font:inherit;font-size:11px;cursor:pointer; }
  button:hover { background:color-mix(in srgb,var(--accent) 14%,var(--panel)); }
  .calendar-grid { display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px; }
  .weekday { display:grid;place-items:center;height:24px;color:var(--muted);font-size:10px; }
  .calendar-day { width:100%;padding:0; }
  .calendar-day.selected { border-color:color-mix(in srgb,var(--accent) 30%,var(--border));background:color-mix(in srgb,var(--canvas) 80%,transparent); }
  .time-field { display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;color:var(--muted);font-size:11px; }
  .time-field input { width:110px;height:30px;padding:0 7px;border:1px solid var(--border);border-radius:4px;background:var(--canvas);color:var(--ink);color-scheme:dark;font:inherit;font-size:12px; }
  .time-field input:disabled { opacity:.5; }
  .calendar-actions { display:flex;justify-content:space-between;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border); }
  @media(pointer:coarse) { :global(.stage1-date-trigger),button,.time-field input { min-height:44px; } .time-field input { font-size:16px; } }
</style>
