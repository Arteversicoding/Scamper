import { Component } from '@angular/core';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {
  photoURL: string = 'assets/default-profile.png';
  
  constructor() {}

  uploadImage() {
    const fileInput: HTMLElement =
    document.getElementById('fileInput')!;
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files![0];

    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => {
        this.photoURL = reader.result as string;
      }
    }
  }
}