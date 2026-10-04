import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RcBackData } from '../../../models/rc.model';

export type { RcBackData };

@Component({
  selector: 'app-rc-back',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rc-back.html',
  styleUrl: './rc-back.css',
})
export class RcBack {
  @Input() data?: Partial<RcBackData>;

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

  private _qrCodeUrl = 'assets/qr.png';
  @Input()
  get qrCodeUrl(): string {
    return this.data?.qrCodeUrl ?? this._qrCodeUrl;
  }
  set qrCodeUrl(value: string) {
    this._qrCodeUrl = value;
  }

  private _mfgMonthYear = '03-2023';
  @Input()
  get mfgMonthYear(): string {
    return this.data?.mfgMonthYear ?? this._mfgMonthYear;
  }
  set mfgMonthYear(value: string) {
    this._mfgMonthYear = value;
  }

  private _noOfCylinders: string | number = 1;
  @Input()
  get noOfCylinders(): string | number {
    return this.data?.noOfCylinders ?? this._noOfCylinders;
  }
  set noOfCylinders(value: string | number) {
    this._noOfCylinders = value;
  }

  private _formType = 'Form 23A';
  @Input()
  get formType(): string {
    return this.data?.formType ?? this._formType;
  }
  set formType(value: string) {
    this._formType = value;
  }

  private _vehicleClass = 'M-CYCLE/SCOOTER (2WN)';
  @Input()
  get vehicleClass(): string {
    return this.data?.vehicleClass ?? this._vehicleClass;
  }
  set vehicleClass(value: string) {
    this._vehicleClass = value;
  }

  private _makerName = 'HERO MOTOCORP LTD';
  @Input()
  get makerName(): string {
    return this.data?.makerName ?? this._makerName;
  }
  set makerName(value: string) {
    this._makerName = value;
  }

  private _modelName = 'SPLENDOR+ BLK STRIPE I3S (DRS)';
  @Input()
  get modelName(): string {
    return this.data?.modelName ?? this._modelName;
  }
  set modelName(value: string) {
    this._modelName = value;
  }

  private _colour = 'BLACK AND ACCENT';
  @Input()
  get colour(): string {
    return this.data?.colour ?? this.data?.color ?? this._colour;
  }
  set colour(value: string) {
    this._colour = value;
  }

  @Input()
  set color(value: string) {
    this._colour = value;
  }
  get color(): string {
    return this.colour;
  }

  private _bodyType = 'SOLO WITH PILLION';
  @Input()
  get bodyType(): string {
    return this.data?.bodyType ?? this._bodyType;
  }
  set bodyType(value: string) {
    this._bodyType = value;
  }

  private _seatingCapacity: string | number = 2;
  @Input()
  get seatingCapacity(): string | number {
    return this.data?.seatingCapacity ?? this._seatingCapacity;
  }
  set seatingCapacity(value: string | number) {
    this._seatingCapacity = value;
  }

  private _unladenWeight: string | number = 111;
  @Input()
  get unladenWeight(): string | number {
    return this.data?.unladenWeight ?? this._unladenWeight;
  }
  set unladenWeight(value: string | number) {
    this._unladenWeight = value;
  }

  private _cubicCapacity: string | number = '97.20';
  @Input()
  get cubicCapacity(): string | number {
    return this.data?.cubicCapacity ?? this._cubicCapacity;
  }
  set cubicCapacity(value: string | number) {
    this._cubicCapacity = value;
  }

  private _horsePower: string | number = '7.91';
  @Input()
  get horsePower(): string | number {
    return this.data?.horsePower ?? this._horsePower;
  }
  set horsePower(value: string | number) {
    this._horsePower = value;
  }

  private _wheelBase: string | number = '1236';
  @Input()
  get wheelBase(): string | number {
    return this.data?.wheelBase ?? this._wheelBase;
  }
  set wheelBase(value: string | number) {
    this._wheelBase = value;
  }

  private _financier = '';
  @Input()
  get financier(): string {
    return this.data?.financier ?? this._financier;
  }
  set financier(value: string) {
    this._financier = value;
  }

  private _authoritySignUrl = '/vahanservice/vahan/javax.faces.resource/dynamiccontent.properties';
  @Input()
  get authoritySignUrl(): string {
    return this.data?.authoritySignUrl ?? this._authoritySignUrl;
  }
  set authoritySignUrl(value: string) {
    this._authoritySignUrl = value;
  }

  private _regAuthority = 'THODUPUZHA SRTO';
  @Input()
  get regAuthority(): string {
    return this.data?.regAuthority ?? this._regAuthority;
  }
  set regAuthority(value: string) {
    this._regAuthority = value;
  }
}
