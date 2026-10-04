import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RcFrontData } from '../../../models/rc.model';

export type { RcFrontData };

@Component({
  selector: 'app-rc-front',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rc-front.html',
  styleUrl: './rc-front.css',
})
export class RcFront {
  @Input() data?: Partial<RcFrontData>;

  private _headerTitle = 'Indian Union Vehicle Registration Certificate';
  @Input()
  get headerTitle(): string {
    return this.data?.headerTitle ?? this._headerTitle;
  }
  set headerTitle(value: string) {
    this._headerTitle = value;
  }

  private _issuedBy = 'GOVERNMENT OF KERALA';
  @Input()
  get issuedBy(): string {
    return this.data?.issuedBy ?? this._issuedBy;
  }
  set issuedBy(value: string) {
    this._issuedBy = value;
  }

  private _vehicleType = 'NT';
  @Input()
  get vehicleType(): string {
    return this.data?.vehicleType ?? this._vehicleType;
  }
  set vehicleType(value: string) {
    this._vehicleType = value;
  }

  private _stateCode = 'KL';
  @Input()
  get stateCode(): string {
    return this.data?.stateCode ?? this._stateCode;
  }
  set stateCode(value: string) {
    this._stateCode = value;
  }

  private _fuel = 'PETROL';
  @Input()
  get fuel(): string {
    return this.data?.fuel ?? this._fuel;
  }
  set fuel(value: string) {
    this._fuel = value;
  }

  private _emissionNorms = 'BHARAT STAGE VI';
  @Input()
  get emissionNorms(): string {
    return this.data?.emissionNorms ?? this._emissionNorms;
  }
  set emissionNorms(value: string) {
    this._emissionNorms = value;
  }

  private _regnNumber = 'KL38K7319';
  @Input()
  get regnNumber(): string {
    return this.data?.regnNumber ?? this.data?.regnNo ?? this._regnNumber;
  }
  set regnNumber(value: string) {
    this._regnNumber = value;
  }

  @Input()
  set regnNo(value: string) {
    this._regnNumber = value;
  }
  get regnNo(): string {
    return this.regnNumber;
  }

  private _regnDate = '26-Jun-2023';
  @Input()
  get regnDate(): string {
    return this.data?.regnDate ?? this._regnDate;
  }
  set regnDate(value: string) {
    this._regnDate = value;
  }

  private _regnValidity = '25-Jun-2038';
  @Input()
  get regnValidity(): string {
    return this.data?.regnValidity ?? this._regnValidity;
  }
  set regnValidity(value: string) {
    this._regnValidity = value;
  }

  private _ownerSerial: string | number = 1;
  @Input()
  get ownerSerial(): string | number {
    return this.data?.ownerSerial ?? this._ownerSerial;
  }
  set ownerSerial(value: string | number) {
    this._ownerSerial = value;
  }

  private _chassisNo = 'MBLHAW220P5C65468';
  @Input()
  get chassisNo(): string {
    return this.data?.chassisNo ?? this._chassisNo;
  }
  set chassisNo(value: string) {
    this._chassisNo = value;
  }

  private _engineNo = 'HA11E7P5C15467';
  @Input()
  get engineNo(): string {
    return this.data?.engineNo ?? this._engineNo;
  }
  set engineNo(value: string) {
    this._engineNo = value;
  }

  private _ownerName = 'ANAND ASOKAN';
  @Input()
  get ownerName(): string {
    return this.data?.ownerName ?? this._ownerName;
  }
  set ownerName(value: string) {
    this._ownerName = value;
  }

  private _sonWifeDaughterOf = 'ASOKAN';
  @Input()
  get sonWifeDaughterOf(): string {
    return this.data?.sonWifeDaughterOf ?? this._sonWifeDaughterOf;
  }
  set sonWifeDaughterOf(value: string) {
    this._sonWifeDaughterOf = value;
  }

  private _ownership = 'INDIVIDUAL';
  @Input()
  get ownership(): string {
    return this.data?.ownership ?? this._ownership;
  }
  set ownership(value: string) {
    this._ownership = value;
  }

  private _address = 'THEKKUMKAL, VELLIYAMATTOM P O, THODUPUZHA, IDUKKI -KERALA-685588';
  @Input()
  get address(): string {
    return this.data?.address ?? this._address;
  }
  set address(value: string) {
    this._address = value;
  }

  private _cardIssueDate = '30-05-2026';
  @Input()
  get cardIssueDate(): string {
    return this.data?.cardIssueDate ?? this._cardIssueDate;
  }
  set cardIssueDate(value: string) {
    this._cardIssueDate = value;
  }
}
