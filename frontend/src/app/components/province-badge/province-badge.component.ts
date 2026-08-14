import { Component, computed, input } from '@angular/core';
import { PLATE_CODE_BY_PROVINCE } from '../../core/data/turkish-province-plate-codes';

@Component({
  selector: 'app-province-badge',
  templateUrl: './province-badge.component.html',
  styleUrl: './province-badge.component.scss',
})
export class ProvinceBadgeComponent {
  readonly cityName = input.required<string>();
  readonly plateCode = computed(() => PLATE_CODE_BY_PROVINCE[this.cityName()] ?? '--');
}
