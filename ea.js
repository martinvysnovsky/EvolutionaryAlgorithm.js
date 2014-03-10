/**
 * Copyright 2014 Martin Vyšňovský (martinvysnovsky@gmail.com)
 */

/**
 * Evolutionary algorithm constructor.
 *
 * @param  array  variables  Variables for algorithm.
 * @param  array  interval   Interval of values that variables cam make.
 */
function EA(variables, interval)
{
	// store variable names
	this.variables = [];
	if(Object.prototype.toString.call(variables) === '[object Array]')
	{
		this.variables = this.variables.concat(variables);
	}
	else
		this.variables.push(variables);

	// check interval
	if(Object.prototype.toString.call(interval) !== '[object Array]' || interval.length != 2)
		throw new Error('Interval must be array with min and max value.');

	// store interval
	this.interval = interval;
}

EA.prototype = {
	constructor: EA,

	/**
	 * Initialize population from individuals.
	 *
	 * @param   string  method  Name of methot to use. Supported values: random
	 * @param   int     n       Number of individuals.
	 *
	 * @return  array           Population.
	 */
	initializePopulation: function(method, n)
	{
		// defaults
		method = method || 'random';
		n = n || 0;

		var population = new EAPopulation(this);

		if(n > 0)
		{
			var generateIndividualFunction;
			switch(method)
			{
				case 'random':
				default:
					var interval = this.interval;
					generateIndividualFunction = function() { return (Math.random() * (interval[1] - interval[0])) + interval[0]; };
			}
		
			while(population.count < n)
			{
				var individual = new EAIndividual(this.variables, generateIndividualFunction);

				//if(population.hasIndividual(individual))
				//	continue;

				population.push(individual);
			}
		}

		return population;
	}
};

/**
 * Individiual for evolutionary algorithm.
 *
 * @param  array  variables  Array of variable names.
 * @param  array  f  		 Function that generates individual value.
 */
function EAIndividual(variables, f)
{
	if(variables)
	{
		for(var v=0, len=variables.length; v<len; v++)
		{
			this[variables[v]] = f();
		}
	}

	this.fitness = 0;
}

EAIndividual.prototype = {
	constructor: EAIndividual,
	toString: function()
	{
		ret = new Array();

		for(p in this)
		{
			if(this.hasOwnProperty(p))
				ret.push(p + ': ' + this[p]);
		}

		return ret.join(', ');
	}
}

/**
 * Population of individuals.
 *
 * @param  array  algorithm  Algorithm that sreates this population.
 */
function EAPopulation(algorithm)
{
	if(!(algorithm instanceof EA))
		throw new Error('First argument must be algorithm that creates this population.');
	
	this.algorithm = algorithm;
	this.individuals = new Array();
}

EAPopulation.prototype = (function()
{
	/**
	 * Get n random individuals in population.
	 *
	 * @param   int    n  Number of individuals.
	 *
	 * @return  array     Array of individuals.
	 */
	function getRandomParents(n)
	{
		var individuals = new Array(n);
		var individuals_length = this.individuals.length;

		for(var i=0; i<n; i++)
		{
			var index = Math.floor(Math.random() * individuals_length);

			individuals[i] = this.individuals[index];
		}

		return individuals;
	}

	/**
	 * Get n best individuals in population.
	 *
	 * @param   int    n  Number of individuals.
	 *
	 * @return  array     Array of best individuals.
	 */
	function getBestParents(n)
	{
		var individuals = this.individuals.slice(0);

		individuals.sort(function(a, b) {
			return b.fitness - a.fitness;
		});

		return individuals.slice(0, n);
	}

	/**
	 * Get n individuals from population using roulette method.
	 *
	 * @param   string  method  	  Method to use.
	 * @param   int     n  			  Number of individuals.
	 * @param   bool    shuffleOrder  Shuffle order of individuals. This is used only for univerzal method.
	 *
	 * @return  array       	Array of individuals.
	 */
	function getParentsFromRoulette(method, n, shuffleOrder)
	{
		var individuals   = this.individuals;
		var fitnessValues = individuals.slice(0).map(function(individual)
		{
			return individual.fitness;
		});
		var parents       = new Array(n);
		var i             = 0; // parent counter
		var rouletteSize  = 0;
		var replacement   = function() { };

		switch(method)
		{
			case 'with_replacement':
			case 'without_replacement':
			default:
				// compute size of roulette
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness)};
				}, {fitness: 0}).fitness;getPa
				break;
			case 'remainder_with_replacement':
			case 'remainder_without_replacement':
				individuals.forEach(function(individual)
				{
					// get only whole part of fitness
					var wholePart = Math.floor(Math.max(0, individual.fitness));

					for(var j=0; j<wholePart; j++, i++)
						parents[i] = individual;
				});

				// compute size of roulette only from decimal part of fitness
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness) % 1};
				}, {fitness: 0}).fitness;

				fitnessValues = fitnessValues.map(function(fitness)
				{
					return (Math.max(0, fitness) % 1);
				});
				break;
			case 'univerzal':
				var shuffleOrder = shuffleOrder || false;
				var keys         = Object.keys(individuals);

				if(shuffleOrder)
				{
					// randomly shuffle order of individuals
					for(var a=0, len=keys.length; a<len; a++)
					{
						b = a + Math.round(Math.random() * (len - a - 1));
						var temp = keys[a];
						keys[a] = keys[b];
						keys[b] = temp;
					}
				}

				// compute size of roulette
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness)};
				}, {fitness: 0}).fitness;

				var pointerStep = rouletteSize / n;

				// compute start position
				var roulette_position = Math.random() * pointerStep;

				f = 0;
				j = 0;

				// select n parents
				for(i; i<n; i++)
				{
					// find parent that is at computed position in roulette
					while(f < roulette_position)
						f += Math.max(0, fitnessValues[keys[j++]]);
					
					parents[i] = individuals[keys[j-1]];

					roulette_position += pointerStep;
				}

				return parents;
		}

		if(method == 'without_replacement' || method == 'remainder_without_replacement')
		{
			replacement = function(j)
			{
				rouletteSize--;
				fitnessValues[j] = Math.max(0, fitnessValues[j]-1);
			};
		}

		// select n parents
		for(i; i<n; i++)
		{
			// twist roulette
			var roulette_position = Math.random() * rouletteSize;

			// find parent that is at computed position in roulette
			f = 0;
			j = 0;
			while(f < roulette_position)
				f += fitnessValues[j++];
			
			parents[i] = individuals[j-1];

			// call replacement function
			replacement(j);
		}

		return parents;
	}

	return {
		constructor: EAPopulation,

		/**
		 * Count individuals in population.
		 *
		 * @return  int
		 */
		get count()
		{
			return this.individuals.length;
		},

		/**
		 * Insert individual to population.
		 *
		 * @param   object  individual
		 *
		 * @return  void
		 */
		push: function(individual)
		{
			if(!(individual instanceof EAIndividual))
				throw new Error('Population must consists only from EAIndividual objects.');

			this.individuals.push(individual);
		},

		/**
		 * Check if population has given individual.
		 *
		 * @param   object   individual
		 *
		 * @return  boolean
		 */
		hasIndividual: function(individual)
		{
			return (this.individuals.indexOf(individual) != -1);
		},

		/**
		 * Compute fitness for every individual in population.
		 *
		 * @param   function  f  Function, that will compute fitness.
		 *
		 * @return  void
		 */
		computeFitness: function(f)
		{
			if(typeof f != 'function')
				throw new Error('Argument must be valid function!');

			for(var i=0, len=this.individuals.length; i<len; i++)
			{
				var individual = this.individuals[i];
			
				individual.fitness = f(individual);
			}
		},

		/**
		 * Get n best individuals in population.
		 *
		 * @param   string  method   Method to use.
		 * @param   int     n  		 Number of individuals.
		 * @param   object  options  Some other settings for methods.
		 *
		 * @return  array      Array of best individuals.
		 */
		getParents: function(method, n, options)
		{
			switch(method)
			{
				case 'best':
					return getBestParents.call(this, n);
					break;
				case 'roulette':
					var rouletteMethod = options.rouletteMethod || 'with_replacement';
					return getParentsFromRoulette.call(this, rouletteMethod, n, options.shuffleOrder);
					break;
				case 'random':
					return getRandomParents.call(this, n);
				default:

			}

			return [];
		},

		applyGeneticOperators: function(parents, method, options)
		{
			if(!(parents.length > 0))
				throw new Error('Argument parents can not by empty.');

			switch(method)
			{
				case 'extremal_mutation':
					var f = function() { return (Math.random() > 0.5) ? interval[1] : interval[0]; };
				case 'uniform_mutation':
				default:
					var f = f || function() { return (Math.random() * (interval[1] - interval[0])) + interval[0]; };

					var n = (options && options.number_of_mutated_values) || 1;
					var variables = this.algorithm.variables;
					var variables_length = variables.length;
					var interval = this.algorithm.interval; 

					for(var i=0, len=parents.length; i<len; i++)
					{
						for(var j=0; j<n; j++)
						{
							var pos = Math.floor(Math.random() * variables_length);
							
							parents[i][variables[pos]] = f();
						}
					}
			}
		}
	}

}());