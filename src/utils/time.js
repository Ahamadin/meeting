// src/utils/time.js

export function formatCallTime(timestamp) {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();

  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  // Aujourd’hui → heure exacte
  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Hier
  if (diffDays === 1) {
    return `Hier à ${date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  // Cette semaine
  if (diffDays < 7) {
    const days = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
    return `${days[date.getDay()]} à ${date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  // Plus ancien
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
