import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Portafolio Juan Barrios';

  ngOnInit() {
    // Basic theme init
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
