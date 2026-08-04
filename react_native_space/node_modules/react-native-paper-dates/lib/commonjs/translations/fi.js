"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
const fi = {
  save: 'Tallenna',
  selectSingle: 'Valitse päivämäärä',
  selectMultiple: 'Valitse päivämäärät',
  selectRange: 'Valitse ajanjakso',
  notAccordingToDateFormat: inputFormat => `Päivämäärän on oltava muodossa ${inputFormat}`,
  mustBeHigherThan: date => `Oltava myöhempi kuin ${date}`,
  mustBeLowerThan: date => `Oltava aikaisempi kuin ${date}`,
  mustBeBetween: (startDate, endDate) => `Oltava välillä ${startDate} - ${endDate}`,
  dateIsDisabled: 'Päivä ei ole sallittu',
  previous: 'Edellinen',
  next: 'Seuraava',
  typeInDate: 'Syötä päivämäärä',
  pickDateFromCalendar: 'Valitse päivämäärä kalenterista',
  close: 'Sulje',
  minute: 'Minuutti',
  hour: 'Tunti'
};
var _default = exports.default = fi;
//# sourceMappingURL=fi.js.map