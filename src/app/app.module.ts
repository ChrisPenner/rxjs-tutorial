import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';


import { AppComponent } from './app.component';
import { SearchBoxComponent } from './search-box/search-box.component';
import { RepositoryListComponent } from './repository-list/repository-list.component';


@NgModule({
  declarations: [
    AppComponent,
    SearchBoxComponent,
    RepositoryListComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
