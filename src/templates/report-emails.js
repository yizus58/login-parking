'use strict';

const { escapeHtml, money } = require('./html');

const layout = (title, body) => `
<body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;">
<table align="center" width="100%" cellpadding="0" cellspacing="0" style="padding:20px;width:100%;">
  <tbody><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;padding:30px;width:100%;">
      <tbody>
        <tr><td style="font-size:24px;font-weight:bold;color:#111;padding-bottom:10px;">${title}</td></tr>
        <tr><td style="font-size:16px;color:#333;line-height:1.5;padding-bottom:20px;">${body}</td></tr>
        <tr><td style="font-size:16px;color:#333;line-height:1.5;padding-bottom:20px;">
          Si necesitas más información, no dudes en contactar al equipo de soporte del sistema.<br><br>
          Este es un mensaje automático, no responda a este correo.<br><br>
          Saludos,<br>Equipo de Soporte
        </td></tr>
      </tbody>
    </table>
  </td></tr></tbody>
</table>
</body>`;

/** Daily summary of one parking for its partner. */
const dailySummaryHtml = (summary, day) =>
    layout(
        'Reporte de Vehículos',
        `Hola <b>${escapeHtml(summary.partner.username)}</b>,<br><br>
        El ${escapeHtml(day)} salieron <b>${summary.vehicle_count}</b> vehículos de
        <b>${escapeHtml(summary.name)}</b>.<br>
        El total de ingresos fue de <b>${money(summary.total_earnings)}</b>.`,
    );

/** E-mail that carries the Excel detail of one parking. */
const dailyDetailHtml = (detail, day) =>
    layout(
        'Reporte de Vehículos',
        `Hola <b>${escapeHtml(detail.username)}</b>,<br><br>
        El ${escapeHtml(day)} salieron <b>${detail.total_vehicles}</b> vehículos de
        <b>${escapeHtml(detail.parking)}</b>.<br>
        En el archivo Excel adjunto encontrará el detalle de los movimientos.`,
    );

module.exports = { dailySummaryHtml, dailyDetailHtml };
