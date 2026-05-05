// Shared label maps used by both TriggerCard and TriggerEditor

export const TRIGGER_ICONS = [
  '🔔','⛈','🌧','🌦','🌩','❄️','🌡️','💨','💧','🌊',
  '☀️','🌤','⛅','☁️','🔥','⚠️','🌀','🌫️','🌈','🌙',
]

export const METRICS = [
  { value: 'rain_probability', label: 'Rain probability', unit: '%',    min: 0,   max: 100, step: 5,  defaultOp: 'gte', defaultVal: 80 },
  { value: 'temp_min',         label: 'Min temperature',  unit: '°C',   min: -50, max: 50,  step: 1,  defaultOp: 'lte', defaultVal: 15 },
  { value: 'temp_max',         label: 'Max temperature',  unit: '°C',   min: -50, max: 50,  step: 1,  defaultOp: 'gte', defaultVal: 30 },
  { value: 'wind_speed',       label: 'Wind speed',       unit: 'km/h', min: 0,   max: 200, step: 5,  defaultOp: 'gte', defaultVal: 50 },
  { value: 'humidity',         label: 'Humidity',         unit: '%',    min: 0,   max: 100, step: 5,  defaultOp: 'gte', defaultVal: 85 },
]

export const OPERATORS = [
  { value: 'gte', label: '≥  at least' },
  { value: 'lte', label: '≤  at most'  },
  { value: 'eq',  label: '=  exactly'  },
]

export const WINDOWS = [
  { value: 'next_30min', label: 'Latest hourly reading' },
  { value: 'today',      label: 'Latest daily summary'  },
  { value: 'tomorrow',   label: 'Previous day summary'  },
]

export const TEMPLATE_VARS = [
  { symbol: '@', desc: 'Temperature'       },
  { symbol: '$', desc: 'Wind speed (km/h)' },
  { symbol: '%', desc: 'Humidity (%)'      },
  { symbol: '&', desc: 'Data timestamp'    },
]

export function metricMeta(value) {
  return METRICS.find(m => m.value === value) ?? METRICS[0]
}

export function conditionSummary(condition) {
  const m   = metricMeta(condition.metric)
  const op  = { gte: '≥', lte: '≤', eq: '=' }[condition.operator] ?? '?'
  const win = WINDOWS.find(w => w.value === condition.window)?.label ?? condition.window
  return `${m.label} ${op} ${condition.value}${m.unit} · ${win}`
}

// Blank template for new triggers
export const BLANK_TRIGGER = {
  name:      '',
  icon:      '🔔',
  enabled:   true,
  condition: { metric: 'temp_max', operator: 'gte', value: 30, window: 'tomorrow' },
  template:  'Hot recently: @. Humidity: %',
}
