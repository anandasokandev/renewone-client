export interface RcBackData {
  vehicleType?: string;
  stateCode?: string;
  regnNumber?: string;
  regnNo?: string;
  qrCodeUrl?: string;
  mfgMonthYear?: string;
  noOfCylinders?: string | number;
  formType?: string;
  vehicleClass?: string;
  makerName?: string;
  modelName?: string;
  colour?: string;
  color?: string;
  bodyType?: string;
  seatingCapacity?: string | number;
  unladenWeight?: string | number;
  cubicCapacity?: string | number;
  horsePower?: string | number;
  wheelBase?: string | number;
  financier?: string;
  authoritySignUrl?: string;
  regAuthority?: string;
}

export interface RcFrontData {
  headerTitle?: string;
  issuedBy?: string;
  vehicleType?: string;
  stateCode?: string;
  fuel?: string;
  emissionNorms?: string;
  regnNumber?: string;
  regnNo?: string;
  regnDate?: string;
  regnValidity?: string;
  ownerSerial?: string | number;
  chassisNo?: string;
  engineNo?: string;
  ownerName?: string;
  sonWifeDaughterOf?: string;
  ownership?: string;
  address?: string;
  cardIssueDate?: string;
}

export interface RcCardData extends RcFrontData, RcBackData {}
