/**
 *    Copyright 2019 Sven Loesekann
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at
       http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 */
import { Component, OnInit, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Movie } from '../common/movie';
import { Actor } from '../common/actor';
import { Genere } from '../common/genere';
import { ActorsService } from '../services/actors.service';
import { MoviesService } from '../services/movies.service';
import { UsersService } from '../services/users.service';
import { Observable } from 'rxjs';
import { FormControl } from '@angular/forms';
import { map, tap, debounceTime, distinctUntilChanged, switchMap, flatMap } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';


@Component( {
    selector: 'app-search',
    templateUrl: './search.component.html',
    styleUrls: ['./search.component.scss']
} )
export class SearchComponent implements OnInit, AfterViewInit {

    generes: Genere[];
    movieTitle = new FormControl();
    movies: Observable<Movie[] | Observable<Movie[]>>;
    movieActor = new FormControl();
    actors: Observable<Actor[] | Observable<Actor[]>>;
    importMovies: Movie[] = [];
    importMovieTitle = new FormControl();
    actorsLoading = false;
    moviesLoading = false;
    importMoviesLoading = false;
    showMenu = false;
    moviesByGenere: Movie[] = [];
    moviesByGenLoading = false;
    scrollMovies: Movie[] = [];
    scMoviesPageEnd = 1;
    @ViewChild('movies') moviesRef: ElementRef;
    loading = false;
    allMoviesLoaded = false;
    private actorListOffset = 0;


    constructor( private actorService: ActorsService,
            private movieService: MoviesService,
            private userService: UsersService,
            private route: ActivatedRoute,
            private router: Router) { }

    ngOnInit() {
        this.actors = this.movieActor.valueChanges.pipe(
            debounceTime( 400 ),
            distinctUntilChanged(),
            tap(() => this.actorsLoading = true ),
            switchMap( name => this.actorService.findActorByName( name ) ),
            tap(() => this.actorsLoading = false ) );
        this.movies = this.movieTitle.valueChanges.pipe(
            debounceTime( 400 ),
            distinctUntilChanged(),
            tap(() => this.moviesLoading = true ),
            switchMap( title => this.movieService.findMovieByTitle( title ) ),
            tap(() => this.moviesLoading = false ) );
        this.userService.allGeneres().subscribe( res => this.generes = res );
        this.route.url.subscribe(res => {
            if(this.userService.loggedIn) {
                this.initScrollMovies();
            }
        });
    }

    ngAfterViewInit(): void {
        this.actorListOffset = this.moviesRef.nativeElement.getBoundingClientRect().y;
    }

    @HostListener( 'window:scroll' ,['$event'])
    scroll($event: any) {
        const ypos = window.pageYOffset + window.innerHeight;
        const contentHeight = this.moviesRef.nativeElement.offsetHeight + this.actorListOffset;
        if(ypos >= contentHeight) {
            this.fetchMore();
        }
    }

    fetchMore() {
        if (this.allMoviesLoaded || this.loading) {return;}
        this.loading = true;
        this.movieService.findMoviesByPage( this.scMoviesPageEnd ).subscribe( res => {
            if(res.length > 0) {
                this.scrollMovies = this.scrollMovies.concat( res );
                this.scMoviesPageEnd += 1;
            } else {
                this.allMoviesLoaded = true;
            }
            this.loading = false;
        } );
    }

    loginClosed( closed: boolean ) {
        if ( closed ) {
            this.initScrollMovies();
        }
    }

    private initScrollMovies() {
        this.loading = false;
        this.allMoviesLoaded = false;
        this.movieService.findMoviesByPage( this.scMoviesPageEnd ).subscribe( res => {
            this.scrollMovies = this.scrollMovies.concat( res );
            this.scMoviesPageEnd += 1;
        } );
    }

    importMovie() {
        this.importMoviesLoading = true;
        const myTitle = this.importMovieTitle.value.replace( / /g, '+' );
        this.movieService.importMoveByTitle( myTitle ).subscribe( m => {
            this.importMovies = this.addNums( m );
            this.importMoviesLoading = false;
        } );
    }

    private addNums( movies: Movie[] ): Movie[] {
        for ( let i = 0; i < movies.length; i++ ) {
            movies[i].num = i;
        }
        return movies;
    }

    importSelMovie( movie: Movie ) {
        this.importMoviesLoading = true;
        this.importMovies = [];
        const myTitle = this.importMovieTitle.value.replace( / /g, '+' );
        this.movieService.importMoveByTitleAndId( myTitle, movie.num ).subscribe( imported => {
            if ( imported )
                {this.importMoviesLoading = false;}
        } );
    }

    dropDown() {
        this.showMenu = !this.showMenu;
        if ( this.moviesByGenere.length > 0 ) {
            this.showMenu = false;
        }
        this.moviesByGenere = [];
    }

    showGenere( id: number ) {
        this.showMenu = false;
        this.moviesByGenLoading = true;
        this.movieService.findMoviesByGenereId( id ).subscribe( res => {
            this.moviesByGenere = res;
            this.moviesByGenLoading = false;
        } );
    }

    movieDetails(movie: Movie) {
        this.router.navigateByUrl('movie/'+movie.id);
    }
}
