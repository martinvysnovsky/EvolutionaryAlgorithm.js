/**
 * Copyright 2014 Martin Vyšňovský (martinvysnovsky@gmail.com)
 */

'use strict';

/**
 * Evolutionary algorithm constructor.
 *
 * @param  array     variables         Variables for algorithm.
 * @param  array     interval          Interval of values that variables cam make.
 * @param  string    number_coding     Typ of numbers that can be used. ('INT', 'REAL')
 * @param  function  fitnessFunction  Fitness function.
 * @param  object    options           More options.
 */
function EA(variables, interval, number_coding, fitnessFunction, options)
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

	// store number coding
	this.number_coding = number_coding.toUpperCase() || 'INT';

	// check fitness function
	if(Object.prototype.toString.call(fitnessFunction) !== '[object Function]')
		throw new Error('Fitness function must be valid function.');

	// store fitness function
	this.fitnessFunction = fitnessFunction;

	// store if individual have varibale length
	this.variable_individual_length = (options && options.variableIndividualLength) || false;
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
				default:
				case 'random':
					var interval = this.interval;

					if(this.number_coding == 'INT')
						generateIndividualFunction = function() { return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]); };
					else
						generateIndividualFunction = function() { return (Math.random() * (interval[1] - interval[0])) + interval[0]; };
			}

			var fitnessFunction = this.fitnessFunction;
			var variable_individual_length = this.variable_individual_length;
			var max_individual_length = 100;
		
			while(population.count < n)
			{
				var variables = (variable_individual_length) ? Array.apply(null, new Array(Math.round(Math.random() * max_individual_length))).map(function (_, i) { return i; }) : this.variables;
				var individual = new EAIndividual(variables, generateIndividualFunction, fitnessFunction);

				population.push(individual);
			}
		}

		return population;
	}
};

/**
 * Individiual for evolutionary algorithm.
 *
 * @param  array     variables         Array of variable names.
 * @param  function  generateFunction  Function that generates individual value.
 * @param  function  fitnessFunction   Function that computes fitness.
 */
function EAIndividual(variables, generateFunction, fitnessFunction)
{
	this.variables = {};

	if(variables)
	{
		for(var v=0, len=variables.length; v<len; v++)
		{
			var variable = variables[v];
			this.variables[variable] = generateFunction(variable, v);
		}
	}

	this.fitness = fitnessFunction(this);
}

EAIndividual.prototype = {
	constructor: EAIndividual,

	toString: function()
	{
		var variables = this.variables;

		var ret = [];

		for(var p in variables)
		{
			if(this.hasOwnProperty(p))
				ret.push(p + ': ' + variables[p]);
		}

		ret.push('fitness: ' + this.fitness);

		return ret.join(', ');
	},

	toArray: function()
	{
		var variables = this.variables;

		var ret = [];

		for(var p in variables)
		{
			ret.push(variables[p]);
		}

		return ret;
	}

};

/**
 * Population of individuals.
 *
 * @param  array  algorithm  Algorithm that sreates this population.
 */
var EAPopulation = (function()
{
	var Constructor = function(algorithm)
	{
		if(!(algorithm instanceof EA))
			throw new Error('First argument must be algorithm that creates this population.');
		
		this.algorithm = algorithm;
		this.individuals = [];
	};

	/**
	 * Get n random individuals in population.
	 *
	 * @param   array  individuals  Individuals in population.
	 * @param   int    n            Number of individuals.
	 *
	 * @return  array     Array of individuals.
	 */
	function getRandomParents(individuals, n)
	{
		var parents            = new Array(n);
		var individuals_length = individuals.length;

		for(var i=0; i<n; i++)
		{
			var index = Math.floor(Math.random() * individuals_length);

			parents[i] = individuals[index];
		}

		return parents;
	}

	/**
	 * Get n best individuals in population.
	 *
	 * @param   array   individuals  Individuals in population.
	 * @param   int     n            Number of individuals.
	 *
	 * @return  array     Array of best individuals.
	 */
	function getBestParents(individuals, n)
	{
		// make copy of array
		individuals = individuals.slice(0);

		individuals.sort(function(a, b) {
			return b.fitness - a.fitness;
		});

		return individuals.slice(0, n);
	}

	/**
	 * Get n individuals from population using roulette method.
	 *
	 * @param   array   individuals   Individuals in population.
	 * @param   string  method        Method to use.
	 * @param   int     n             Number of individuals.
	 * @param   bool    shuffleOrder  Shuffle order of individuals. This is used only for univerzal method.
	 *
	 * @return  array                 Array of individuals.
	 */
	function getParentsFromRoulette(individuals, method, n, shuffleOrder)
	{
		var fitnessValues = individuals.slice(0).map(function(individual)
		{
			return Math.max(0, individual.fitness);
		});
		var parents       = new Array(n);
		var i             = 0; // parent counter
		var rouletteSize  = 0;
		var replacement   = function() { };

		switch(method)
		{
			default:
			case 'with_replacement':
			case 'without_replacement':
				// compute size of roulette
				rouletteSize = individuals.reduce(function(a, b)
				{
					return {fitness: a.fitness + Math.max(0, b.fitness)};
				}, {fitness: 0}).fitness;

				if(rouletteSize === 0)
					return [];
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

				if(rouletteSize === 0)
					return parents;

				fitnessValues = fitnessValues.map(function(fitness)
				{
					return (Math.max(0, fitness) % 1);
				});
				break;
			case 'univerzal':
				shuffleOrder = shuffleOrder || false;
				var keys     = Object.keys(individuals);

				if(shuffleOrder)
				{
					// randomly shuffle order of individuals
					for(var a=0, len=keys.length; a<len; a++)
					{
						var b = a + Math.round(Math.random() * (len - a - 1));
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

				if(rouletteSize === 0)
					return [];

				var pointerStep = rouletteSize / n;

				// compute start position
				var roulette_position = Math.random() * pointerStep;

				var f = 0;
				var j = 0;

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
			roulette_position = Math.random() * rouletteSize;

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

	Constructor.prototype = {
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
		 * Get n best individuals in population.
		 *
		 * @param   string  method   Method to use.
		 * @param   int     n        Number of individuals.
		 * @param   object  options  Some other settings for methods.
		 *
		 * @return  array      Array of best individuals.
		 */
		getParents: function(method, n, options)
		{
			switch(method)
			{
				case 'best':
					return getBestParents(this.individuals, n);
				case 'roulette':
					var rouletteMethod = options.rouletteMethod || 'with_replacement';
					return getParentsFromRoulette(this.individuals, rouletteMethod, n, options.shuffleOrder);
				case 'random':
					return getRandomParents(this.individuals, n);
				default:

			}

			return [];
		},

		applyGeneticOperators: function(parents, method, options)
		{
			if(!parents || parents.length === 0)
				return [];

			var algorithm = this.algorithm;
			var interval  = algorithm.interval;

			var parents_length = parents.length;
			var children       = new Array(parents_length);

			var getVariables;	// function to get new variables for children
			var generateFunction;
			var fitnessFunction = algorithm.fitnessFunction;

			var f;
			var current_individual_data;

			switch(method)
			{
				case 'extremal_mutation':
					if(this.algorithm.number_coding == 'INT')
						f = function() { return Math.round((Math.random() > 0.5) ? interval[1] : interval[0]); };
					else
						f = function() { return (Math.random() > 0.5) ? interval[1] : interval[0]; };
					// fall through
				default:
				case 'uniform_mutation':
					if(this.algorithm.number_coding == 'INT')
						f = function() { return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]); };
					else
						f = function() { return (Math.random() * (interval[1] - interval[0])) + interval[0]; };

					var n = (options && options.number_of_mutated_values) || 1;

					getVariables = function(i)
					{
						current_individual_data = parents[i].variables;
						var variable_keys = Object.keys(current_individual_data);

						return variable_keys;
					};

					generateFunction = function(variable, k)
					{
						var variables_length = Object.keys(current_individual_data).length;

						var pos = new Array(n);
						for(var j=0; j<n; j++)
						{
							pos[j] = Math.floor(Math.random() * variables_length);
						}
						
						return (pos.indexOf(k) != -1) ? f() : current_individual_data[variable];
					};
					break;
				case 'shrink_mutation':
					var max_shrink_size  = (options && options.max_shrink_size) || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var start_pos        = Math.round(Math.random() * variables_length);
						var shrink_size      = Math.round(Math.random() * max_shrink_size);

						current_individual_data = parent.toArray();
						current_individual_data.splice(start_pos, shrink_size);

						return Array.apply(null, new Array(current_individual_data.length)).map(function (_, i) { return i; });
					};

					generateFunction = function(variable)
					{
						return current_individual_data[variable];
					};
					break;
				case 'growth_mutation':
					var max_growth_size = (options && options.max_growth_size) || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var pos              = Math.round(Math.random() * variables_length); // position to insert
						var growth_size      = Math.round(Math.random() * max_growth_size);

						var variables = Array.apply(null, new Array(growth_size)).map(function () {
							return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]);
						});

						current_individual_data = parent.toArray();
						variables.unshift(0);
						variables.unshift(pos);
						Array.prototype.splice.apply(current_individual_data, variables);

						return Array.apply(null, new Array(current_individual_data.length)).map(function (_, i) {return i;});
					};

					generateFunction = function(variable)
					{
						return current_individual_data[variable];
					};
					break;
				case 'swap_mutation':
					var max_swap_size = (options && options.max_swap_size) || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var swap_size        = Math.round(Math.random() * max_swap_size);
						var max_index        = variables_length - swap_size;
						var pos1             = Math.round(Math.random() * max_index);
						var pos2             = Math.min(Math.round(Math.random() * (max_index - pos1)) + pos1, max_index);

						current_individual_data = parent.toArray();
						var data2 = current_individual_data.slice(pos2, pos2 + swap_size);
						data2.unshift(swap_size);
						data2.unshift(pos1);
						var data1 = Array.prototype.splice.apply(current_individual_data, data2);
						data1.unshift(swap_size);
						data1.unshift(pos2);
						Array.prototype.splice.apply(current_individual_data, data1);

						return variable_keys;
					};

					generateFunction = function(variable)
					{
						return current_individual_data[variable];
					};
					break;
				case 'replace_mutation':
					var max_replace_size = (options && options.max_replace_size) || 5;
					var max_insert_size  = (options && options.max_insert_size) || 5;

					getVariables = function(i)
					{
						var parent = parents[i];

						var variable_keys    = Object.keys(parent.variables);
						var variables_length = variable_keys.length;
						var start_pos        = Math.round(Math.random() * variables_length);
						var replace_size     = Math.round(Math.random() * max_replace_size);
						var insert_size      = Math.round(Math.random() * max_insert_size);

						var variables = Array.apply(null, new Array(insert_size)).map(function () {
							return Math.round((Math.random() * (interval[1] - interval[0])) + interval[0]);
						});

						current_individual_data = parent.toArray();
						variables.unshift(replace_size);
						variables.unshift(start_pos);
						Array.prototype.splice.apply(current_individual_data, variables);

						return Array.apply(null, new Array(current_individual_data.length)).map(function (_, i) {return i;});
					};

					generateFunction = function(variable)
					{
						return current_individual_data[variable];
					};
					break;
			}

			// mutate all parents and create children
			for(var i=0; i<parents_length; i++)
			{
				children[i] = new EAIndividual(getVariables(i), generateFunction, fitnessFunction);
			}

			return children;
		},

		/**
		 * Method to replace individuals in curent population with new ones
		 *
		 * @param   array   parents   Selected parents from curent population.
		 * @param   array   children  Generated children from genetic operators.
		 * @param   string  method    Method to use.
		 * @param   object  options   Options for some methods.
		 *
		 * @return  void
		 */
		replacement: function(parents, children, method, options)
		{
			var individuals_length = this.individuals.length;
			var newGenerationSize;

			switch(method)
			{
				case 'comma_strategy':
					newGenerationSize = (options && options.newGenerationSize) || individuals_length;

					// sort children by fitness
					children.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					this.individuals = children.slice(0, newGenerationSize);
					break;
				case 'separate_competition':
					var generationGap = (options && options.generationGap) || 0;
					var num_parents = individuals_length - generationGap;

					// sort parents by fitness
					parents.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					parents = parents.slice(0, num_parents);

					// sort children by fitness
					children.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					this.individuals = parents.concat(children.slice(0, generationGap));
					break;
				case 'plus_strategy':
					newGenerationSize = (options && options.newGenerationSize) || individuals_length;
					var plus = parents.concat(children);

					// sort parents and children by fitness
					plus.sort(function(a, b) {
						return b.fitness - a.fitness;
					});

					this.individuals = plus.slice(0, newGenerationSize);
					break;
				default:
				case 'generational':
					this.individuals = children;
			}
		}
	};

	return Constructor;
}());