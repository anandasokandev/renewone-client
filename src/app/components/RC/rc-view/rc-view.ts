import { Component } from '@angular/core';
import { RcFront } from '../rc-front/rc-front';
import { RcBack } from '../rc-back/rc-back';

@Component({
  selector: 'app-rc-view',
  imports: [RcFront, RcBack],
  templateUrl: './rc-view.html',
  styleUrl: './rc-view.css',
})
export class RcView {}
